import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
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

  async findByQuery(licensePlate?: string, vinNumber?: string): Promise<Vehicle> {
    const where: any[] = [];

    if (licensePlate) where.push({ licensePlate: licensePlate });
    if (vinNumber) where.push({ vinNumber: vinNumber });

    const vehicle = await this.vehiclesRepository.findOne({ where });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ${licensePlate} not found`);
    }
    return vehicle;
  }

  async findOrCreate(dto: CreateVehicleDto): Promise<{vehicle: Vehicle, created: boolean}> {
    const where: any[] = [];

    if (dto.licensePlate) where.push({ licensePlate: dto.licensePlate });
    if (dto.vinNumber) where.push({ vinNumber: dto.vinNumber });

    let vehicle = await this.vehiclesRepository.findOne({ where });
    if (vehicle) {
      return { vehicle: vehicle, created: false };
    }
    vehicle = this.vehiclesRepository.create({
      ...dto,
      registerStatus: VehicleRegisterStatus.IN_PROGRESS,
    });
    vehicle = await this.vehiclesRepository.save(vehicle);
    return { vehicle: vehicle, created: true }
  }
}
