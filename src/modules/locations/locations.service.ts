import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCurrentLocationDto } from './dto/create-current-location.dto';
import { UpdateCurrentLocationDto } from './dto/update-current-location.dto';
import { CurrentLocation } from './entities/current-location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(CurrentLocation)
    private readonly locationsRepository: Repository<CurrentLocation>,
  ) {}

  create(dto: CreateCurrentLocationDto): Promise<CurrentLocation> {
    const location = this.locationsRepository.create(dto);
    return this.locationsRepository.save(location);
  }

  findAll(): Promise<CurrentLocation[]> {
    return this.locationsRepository.find();
  }

  async findOne(id: string): Promise<CurrentLocation> {
    const location = await this.locationsRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return location;
  }

  async update(
    id: string,
    dto: UpdateCurrentLocationDto,
  ): Promise<CurrentLocation> {
    const location = await this.findOne(id);
    Object.assign(location, dto);
    return this.locationsRepository.save(location);
  }

  async remove(id: string): Promise<void> {
    const result = await this.locationsRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Location ${id} not found`);
    }
  }
}
