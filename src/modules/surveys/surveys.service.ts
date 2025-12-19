import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SurveyBrand } from '../../common/enums/survey-brand.enum';
import { Survey, SurveyStatus } from './entities/survey.entity';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveysRepository: Repository<Survey>,
  ) {}

  create(dto: CreateSurveyDto): Promise<Survey> {
    const survey = this.surveysRepository.create({
      name: dto.name,
      brand: dto.brand,
      isActive: true,
      status: SurveyStatus.DRAFT,
    });
    return this.surveysRepository.save(survey);
  }

  findAll(): Promise<Survey[]> {
    return this.surveysRepository.find();
  }

  async findOne(id: string): Promise<Survey> {
    const survey = await this.surveysRepository.findOne({ where: { id } });
    if (!survey) throw new NotFoundException(`Survey ${id} not found`);
    return survey;
  }

  async update(id: string, dto: UpdateSurveyDto): Promise<Survey> {
    const survey = await this.findOne(id);

    if (survey.status === SurveyStatus.READY) {
      const triesToChangeName = typeof dto.name === 'string' && dto.name !== survey.name;
      const triesToChangeBrand = dto.brand != null && dto.brand !== survey.brand;
      const triesToChangeStatus = dto.status != null && dto.status !== SurveyStatus.READY;
      if (triesToChangeName || triesToChangeBrand || triesToChangeStatus) {
        throw new BadRequestException('Survey is ready and cannot be modified');
      }
    }

    if (dto.status === SurveyStatus.READY) {
      survey.status = SurveyStatus.READY;
      delete dto.status;
    }
    Object.assign(survey, dto);
    return this.surveysRepository.save(survey);
  }

  async remove(id: string): Promise<void> {
    const result = await this.surveysRepository.delete(id);
    if (!result.affected) throw new NotFoundException(`Survey ${id} not found`);
  }

  findActiveByBrand(brand: SurveyBrand): Promise<Survey[]> {
    return this.surveysRepository.find({
      where: { brand, isActive: true, status: SurveyStatus.READY },
    });
  }
}
