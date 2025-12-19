import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestDriveForm } from '../test-drive-forms/entities/test-drive-form.entity';
import { SurveyResponse, SurveyResponseStatus } from './entities/survey-response.entity';
import { SurveyVersion } from './entities/survey-version.entity';
import { SurveyBrand } from '../../common/enums/survey-brand.enum';
import { Survey, SurveyStatus } from './entities/survey.entity';

@Injectable()
export class SurveyAutomationService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveysRepository: Repository<Survey>,
    @InjectRepository(SurveyVersion)
    private readonly versionsRepository: Repository<SurveyVersion>,
    @InjectRepository(SurveyResponse)
    private readonly responsesRepository: Repository<SurveyResponse>,
  ) {}

  async ensureResponseForTestDriveForm(params: {
    testDriveFormId: string;
    brand: SurveyBrand;
  }): Promise<{ response: SurveyResponse; created: boolean }> {
    const existing = await this.responsesRepository.findOne({
      where: {
        testDriveForm: { id: params.testDriveFormId },
        surveyVersion: { survey: { brand: params.brand } },
      },
      relations: ['surveyVersion', 'surveyVersion.survey', 'testDriveForm'],
    });
    if (existing) return { response: existing, created: false };

    const survey = await this.surveysRepository.findOne({
      where: { brand: params.brand, isActive: true, status: SurveyStatus.READY },
      order: { createdAt: 'DESC' },
    });
    if (!survey) {
      throw new NotFoundException(
        `No active survey found for brand "${params.brand}"`,
      );
    }

    const currentVersion = await this.versionsRepository.findOne({
      where: { survey: { id: survey.id }, isCurrent: true },
      relations: ['survey'],
    });
    if (!currentVersion) {
      throw new NotFoundException(
        `Survey "${survey.id}" has no current version`,
      );
    }

    const response = this.responsesRepository.create({
      surveyVersion: currentVersion,
      testDriveForm: { id: params.testDriveFormId } as TestDriveForm,
      status: SurveyResponseStatus.STARTED,
      submittedAt: null,
    });

    try {
      const saved = await this.responsesRepository.save(response);
      const full = await this.responsesRepository.findOne({
        where: { id: saved.id },
        relations: ['surveyVersion', 'surveyVersion.survey', 'testDriveForm'],
      });
      if (!full) throw new Error('Failed to load created survey response');
      return { response: full, created: true };
    } catch (err: any) {
      // If a concurrent request created it first, return the existing response.
      const concurrent = await this.responsesRepository.findOne({
        where: {
          testDriveForm: { id: params.testDriveFormId },
          surveyVersion: { id: currentVersion.id },
        },
        relations: ['surveyVersion', 'surveyVersion.survey', 'testDriveForm'],
      });
      if (concurrent) return { response: concurrent, created: false };
      throw new BadRequestException('Failed to create survey response');
    }
  }
}
