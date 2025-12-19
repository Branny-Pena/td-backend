import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { CreateSurveyVersionDto } from './dto/create-survey-version.dto';
import { Survey, SurveyStatus } from './entities/survey.entity';
import { SurveyQuestion, SurveyQuestionType } from './entities/survey-question.entity';
import { SurveyQuestionOption } from './entities/survey-question-option.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { SurveyVersion } from './entities/survey-version.entity';

@Injectable()
export class SurveyVersionsService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveysRepository: Repository<Survey>,
    @InjectRepository(SurveyVersion)
    private readonly versionsRepository: Repository<SurveyVersion>,
    @InjectRepository(SurveyQuestion)
    private readonly questionsRepository: Repository<SurveyQuestion>,
    @InjectRepository(SurveyQuestionOption)
    private readonly optionsRepository: Repository<SurveyQuestionOption>,
    @InjectRepository(SurveyResponse)
    private readonly responsesRepository: Repository<SurveyResponse>,
  ) {}

  private async loadSurvey(id: string): Promise<Survey> {
    const survey = await this.surveysRepository.findOne({ where: { id } });
    if (!survey) throw new NotFoundException(`Survey ${id} not found`);
    return survey;
  }

  private async loadVersion(id: string): Promise<SurveyVersion> {
    const version = await this.versionsRepository.findOne({
      where: { id },
      relations: ['survey'],
    });
    if (!version) throw new NotFoundException(`Survey version ${id} not found`);
    return version;
  }

  async createForSurvey(
    surveyId: string,
    dto: CreateSurveyVersionDto,
  ): Promise<SurveyVersion> {
    const survey = await this.loadSurvey(surveyId);
    if (survey.status === SurveyStatus.READY) {
      throw new BadRequestException('Survey is ready and cannot be modified');
    }
    const isCurrent = dto.isCurrent === true;

    return this.versionsRepository.manager.transaction(async (manager) => {
      if (isCurrent) {
        await manager
          .createQueryBuilder()
          .update(SurveyVersion)
          .set({ isCurrent: false })
          .where('"surveyId" = :surveyId', { surveyId: survey.id })
          .execute();
      }

      const version = manager.create(SurveyVersion, {
        survey,
        version: dto.version,
        isCurrent,
        notes: dto.notes ?? null,
      });

      return manager.save(version);
    });
  }

  async listForSurvey(surveyId: string): Promise<SurveyVersion[]> {
    await this.loadSurvey(surveyId);
    return this.versionsRepository.find({
      where: { survey: { id: surveyId } },
      order: { version: 'DESC' },
    });
  }

  async getCurrentForSurvey(surveyId: string): Promise<SurveyVersion> {
    await this.loadSurvey(surveyId);
    const current = await this.versionsRepository.findOne({
      where: { survey: { id: surveyId }, isCurrent: true },
    });
    if (!current) {
      throw new NotFoundException(
        `Current survey version for survey ${surveyId} not found`,
      );
    }
    return current;
  }

  async addQuestion(
    versionId: string,
    dto: CreateSurveyQuestionDto,
  ): Promise<SurveyQuestion> {
    const version = await this.loadVersion(versionId);
    if (version.survey.status === SurveyStatus.READY) {
      throw new BadRequestException('Survey is ready and cannot be modified');
    }
    const hasResponses = (await this.responsesRepository.count({
      where: { surveyVersion: { id: version.id } },
    })) > 0;
    if (hasResponses) {
      throw new BadRequestException(
        'Survey version is immutable because it already has responses',
      );
    }

    if (dto.type === SurveyQuestionType.NUMBER) {
      if (dto.minValue == null || dto.maxValue == null) {
        throw new BadRequestException(
          'minValue and maxValue are required for number questions',
        );
      }
      if (dto.minValue > dto.maxValue) {
        throw new BadRequestException('minValue must be <= maxValue');
      }
    }

    if (
      dto.type === SurveyQuestionType.OPTION_SINGLE ||
      dto.type === SurveyQuestionType.OPTION_MULTI
    ) {
      if (!dto.options?.length) {
        throw new BadRequestException(
          'options are required for option questions',
        );
      }
    }

    const question = this.questionsRepository.create({
      surveyVersion: version,
      type: dto.type,
      label: dto.label,
      isRequired: dto.isRequired,
      orderIndex: dto.orderIndex,
      minValue: dto.type === SurveyQuestionType.NUMBER ? dto.minValue ?? null : null,
      maxValue: dto.type === SurveyQuestionType.NUMBER ? dto.maxValue ?? null : null,
    });

    if (dto.options?.length) {
      question.options = dto.options.map((o, idx) =>
        this.optionsRepository.create({
          label: o.label,
          value: o.value,
          orderIndex: o.orderIndex ?? idx + 1,
        }),
      );
    }

    return this.questionsRepository.save(question);
  }

  async getFullVersion(versionId: string): Promise<SurveyVersion> {
    const version = await this.versionsRepository
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.survey', 'survey')
      .leftJoinAndSelect('version.questions', 'question')
      .leftJoinAndSelect('question.options', 'option')
      .where('version.id = :versionId', { versionId })
      .orderBy('question.orderIndex', 'ASC')
      .addOrderBy('option.orderIndex', 'ASC')
      .addOrderBy('option.label', 'ASC')
      .getOne();

    if (!version) throw new NotFoundException(`Survey version ${versionId} not found`);
    return version;
  }
}
