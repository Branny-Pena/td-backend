import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReturnStateDto } from './dto/create-return-state.dto';
import { UpdateReturnStateDto } from './dto/update-return-state.dto';
import { ReturnState } from './entities/return-state.entity';
import { Image, ReturnStateImageRole } from '../images/entities/image.entity';

@Injectable()
export class ReturnStatesService {
  constructor(
    @InjectRepository(ReturnState)
    private readonly returnStatesRepository: Repository<ReturnState>,
    @InjectRepository(Image)
    private readonly imagesRepository: Repository<Image>,
  ) {}

  private async upsertSingleRoleImage(
    returnState: ReturnState,
    role: ReturnStateImageRole,
    url: string,
  ): Promise<Image> {
    const existing = await this.imagesRepository.findOne({
      where: { returnState: { id: returnState.id }, role },
    });
    if (existing) {
      existing.url = url;
      // Ensure the FK is always set when saving; otherwise TypeORM can try to null it.
      existing.returnState = returnState;
      return this.imagesRepository.save(existing);
    }
    const created = this.imagesRepository.create({ url, role, returnState });
    return this.imagesRepository.save(created);
  }

  private keepVehicleImages(returnState: ReturnState): ReturnState {
    if (returnState.images?.length) {
      returnState.images = returnState.images.filter(
        (image) => image.role === ReturnStateImageRole.VEHICLE,
      );
    }
    return returnState;
  }

  async create(dto: CreateReturnStateDto): Promise<ReturnState> {
    const returnState = this.returnStatesRepository.create();

    const saved = await this.returnStatesRepository.save(returnState);

    const vehicleImages = (dto.images ?? []).map((url) =>
      this.imagesRepository.create({
        url,
        role: ReturnStateImageRole.VEHICLE,
        returnState: saved,
      }),
    );
    if (vehicleImages.length) {
      await this.imagesRepository.save(vehicleImages);
    }

    const [mileageImage, fuelLevelImage] = await Promise.all([
      this.upsertSingleRoleImage(
        saved,
        ReturnStateImageRole.MILEAGE,
        dto.mileageImageUrl,
      ),
      this.upsertSingleRoleImage(
        saved,
        ReturnStateImageRole.FUEL_LEVEL,
        dto.fuelLevelImageUrl,
      ),
    ]);
    saved.mileageImage = mileageImage;
    saved.fuelLevelImage = fuelLevelImage;
    await this.returnStatesRepository.save(saved);

    return this.findOne(saved.id);
  }

  findAll(): Promise<ReturnState[]> {
    return this.returnStatesRepository
      .find({
        relations: ['images', 'mileageImage', 'fuelLevelImage'],
      })
      .then((items) => items.map((item) => this.keepVehicleImages(item)));
  }

  async findOne(id: string): Promise<ReturnState> {
    const returnState = await this.returnStatesRepository.findOne({
      where: { id },
      relations: ['images', 'mileageImage', 'fuelLevelImage'],
    });
    if (!returnState) {
      throw new NotFoundException(`Return state ${id} not found`);
    }
    return this.keepVehicleImages(returnState);
  }

  async update(id: string, dto: UpdateReturnStateDto): Promise<ReturnState> {
    const returnState = await this.findOne(id);
    if (dto.mileageImageUrl !== undefined) {
      const mileageImage = await this.upsertSingleRoleImage(
        returnState,
        ReturnStateImageRole.MILEAGE,
        dto.mileageImageUrl,
      );
      returnState.mileageImage = mileageImage;
    }
    if (dto.fuelLevelImageUrl !== undefined) {
      const fuelLevelImage = await this.upsertSingleRoleImage(
        returnState,
        ReturnStateImageRole.FUEL_LEVEL,
        dto.fuelLevelImageUrl,
      );
      returnState.fuelLevelImage = fuelLevelImage;
    }

    if (dto.images !== undefined) {
      await this.imagesRepository.delete({
        returnState: { id } as ReturnState,
        role: ReturnStateImageRole.VEHICLE,
      });
      const vehicleImages = dto.images.map((url) =>
        this.imagesRepository.create({
          url,
          role: ReturnStateImageRole.VEHICLE,
          returnState,
        }),
      );
      if (vehicleImages.length) {
        await this.imagesRepository.save(vehicleImages);
      }
    }
    const saved = await this.returnStatesRepository.save(returnState);
    return this.findOne(saved.id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.returnStatesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Return state ${id} not found`);
    }
  }
}
