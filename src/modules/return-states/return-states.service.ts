import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReturnStateDto } from './dto/create-return-state.dto';
import { UpdateReturnStateDto } from './dto/update-return-state.dto';
import { ReturnState } from './entities/return-state.entity';
import { Image } from '../images/entities/image.entity';

@Injectable()
export class ReturnStatesService {
  constructor(
    @InjectRepository(ReturnState)
    private readonly returnStatesRepository: Repository<ReturnState>,
    @InjectRepository(Image)
    private readonly imagesRepository: Repository<Image>,
  ) {}

  async create(dto: CreateReturnStateDto): Promise<ReturnState> {
    const returnState = this.returnStatesRepository.create({
      finalMileage: dto.finalMileage,
      fuelLevelPercentage: dto.fuelLevelPercentage,
    });
    if (dto.images?.length) {
      returnState.images = dto.images.map((url) =>
        this.imagesRepository.create({ url }),
      );
    }
    return this.returnStatesRepository.save(returnState);
  }

  findAll(): Promise<ReturnState[]> {
    return this.returnStatesRepository.find({ relations: ['images'] });
  }

  async findOne(id: string): Promise<ReturnState> {
    const returnState = await this.returnStatesRepository.findOne({
      where: { id },
      relations: ['images'],
    });
    if (!returnState) {
      throw new NotFoundException(`Return state ${id} not found`);
    }
    return returnState;
  }

  async update(id: string, dto: UpdateReturnStateDto): Promise<ReturnState> {
    const returnState = await this.findOne(id);
    if (dto.finalMileage !== undefined) {
      returnState.finalMileage = dto.finalMileage;
    }
    if (dto.fuelLevelPercentage !== undefined) {
      returnState.fuelLevelPercentage = dto.fuelLevelPercentage;
    }
    if (dto.images) {
      await this.imagesRepository.delete({
        returnState: { id } as ReturnState,
      });
      returnState.images = dto.images.map((url) =>
        this.imagesRepository.create({ url }),
      );
    }
    return this.returnStatesRepository.save(returnState);
  }

  async remove(id: string): Promise<void> {
    const result = await this.returnStatesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Return state ${id} not found`);
    }
  }
}
