import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateVehicleQrDto } from './dto/create-vehicle-qr.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleRegisterStatus } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  create(dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehiclesRepository.create(dto);
    return this.vehiclesRepository.save(vehicle);
  }

  findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find();
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);
    Object.assign(vehicle, dto);
    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const result = await this.vehiclesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
  }

  async findByQuery(
    licensePlate?: string,
    vinNumber?: string,
  ): Promise<Vehicle> {
    const qb = this.vehiclesRepository.createQueryBuilder('vehicle');
    let hasFilter = false;

    if (licensePlate) {
      const normalizedPlate = this.normalizeLookup(licensePlate);
      qb.orWhere(
        "REPLACE(UPPER(vehicle.licensePlate), ' ', '') = :plate",
        { plate: normalizedPlate },
      );
      hasFilter = true;
    }

    if (vinNumber) {
      const normalizedVin = this.normalizeLookup(vinNumber);
      qb.orWhere("REPLACE(UPPER(vehicle.vinNumber), ' ', '') = :vin", {
        vin: normalizedVin,
      });
      hasFilter = true;
    }

    if (!hasFilter) {
      throw new NotFoundException(
        'Vehicle lookup requires licensePlate or vinNumber',
      );
    }

    const vehicle = await qb.getOne();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ${licensePlate} not found`);
    }
    return vehicle;
  }

  async findOrCreate(
    dto: CreateVehicleDto,
  ): Promise<{ vehicle: Vehicle; created: boolean }> {
    const normalizedPlate = this.normalizeLookup(dto.licensePlate);
    const normalizedVin = this.normalizeLookup(dto.vinNumber);
    let vehicle = await this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .where("REPLACE(UPPER(vehicle.licensePlate), ' ', '') = :plate", {
        plate: normalizedPlate,
      })
      .orWhere("REPLACE(UPPER(vehicle.vinNumber), ' ', '') = :vin", {
        vin: normalizedVin,
      })
      .getOne();
    if (vehicle) {
      return { vehicle: vehicle, created: false };
    }
    vehicle = this.vehiclesRepository.create({
      ...dto,
      registerStatus: VehicleRegisterStatus.IN_PROGRESS,
    });
    vehicle = await this.vehiclesRepository.save(vehicle);
    return { vehicle: vehicle, created: true };
  }

  async generateQrCode(
    dto: CreateVehicleQrDto,
  ): Promise<{ payload: string; qrCodeDataUrl: string }> {
    const payload = JSON.stringify({
      marca: dto.brand.trim(),
      modelo: dto.model.trim(),
      color: dto.color.trim(),
      placa: dto.licensePlate.trim(),
      vin: dto.vin.trim(),
      ubicacion: dto.location.trim(),
    });

    const qrCodeDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 6,
    });

    return { payload, qrCodeDataUrl };
  }

  private normalizeLookup(value: string): string {
    return value.replace(/\s+/g, '').trim().toUpperCase();
  }
}
