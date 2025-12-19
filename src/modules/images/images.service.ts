import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { Image } from './entities/image.entity';
import { ReturnState } from '../return-states/entities/return-state.entity';

@Injectable()
export class ImagesService {
  constructor(
    @InjectRepository(Image)
    private readonly imagesRepository: Repository<Image>,
    @InjectRepository(ReturnState)
    private readonly returnStatesRepository: Repository<ReturnState>,
  ) {}

  async create(dto: CreateImageDto): Promise<Image> {
    const returnState = await this.returnStatesRepository.findOne({
      where: { id: dto.returnStateId },
    });
    if (!returnState) {
      throw new NotFoundException(
        `Return state ${dto.returnStateId} not found`,
      );
    }
    const image = this.imagesRepository.create({
      url: dto.url,
      returnState,
    });
    return this.imagesRepository.save(image);
  }

  findAll(): Promise<Image[]> {
    return this.imagesRepository.find({
      relations: ['returnState'],
    });
  }

  async findOne(id: string): Promise<Image> {
    const image = await this.imagesRepository.findOne({
      where: { id },
      relations: ['returnState'],
    });
    if (!image) {
      throw new NotFoundException(`Image ${id} not found`);
    }
    return image;
  }

  async update(id: string, dto: UpdateImageDto): Promise<Image> {
    const image = await this.findOne(id);
    if (dto.returnStateId) {
      const returnState = await this.returnStatesRepository.findOne({
        where: { id: dto.returnStateId },
      });
      if (!returnState) {
        throw new NotFoundException(
          `Return state ${dto.returnStateId} not found`,
        );
      }
      image.returnState = returnState;
    }
    if (dto.url !== undefined) {
      image.url = dto.url;
    }
    return this.imagesRepository.save(image);
  }

  async remove(id: string): Promise<void> {
    const result = await this.imagesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Image ${id} not found`);
    }
  }
}
