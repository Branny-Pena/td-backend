import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestDriveForm } from '../test-drive-forms/entities/test-drive-form.entity';
import { StartSurveyResponseDto } from './dto/start-survey-response.dto';
import { SubmitSurveyAnswersDto } from './dto/submit-survey-answers.dto';
import { SurveyAnswer } from './entities/survey-answer.entity';
import { SurveyQuestion, SurveyQuestionType } from './entities/survey-question.entity';
import { SurveyResponse, SurveyResponseStatus } from './entities/survey-response.entity';
import { SurveyVersion } from './entities/survey-version.entity';
import { Customer } from '../customers/entities/customers.entity';

@Injectable()
export class SurveyResponsesService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly responsesRepository: Repository<SurveyResponse>,
    @InjectRepository(SurveyAnswer)
    private readonly answersRepository: Repository<SurveyAnswer>,
    @InjectRepository(SurveyVersion)
    private readonly versionsRepository: Repository<SurveyVersion>,
    @InjectRepository(SurveyQuestion)
    private readonly questionsRepository: Repository<SurveyQuestion>,
    @InjectRepository(TestDriveForm)
    private readonly testDriveFormsRepository: Repository<TestDriveForm>,
  ) {}

  private async loadVersion(id: string): Promise<SurveyVersion> {
    const version = await this.versionsRepository.findOne({ where: { id } });
    if (!version) throw new NotFoundException(`Survey version ${id} not found`);
    return version;
  }

  private async loadTestDriveForm(id: string): Promise<TestDriveForm> {
    const form = await this.testDriveFormsRepository.findOne({ where: { id } });
    if (!form) throw new NotFoundException(`Test drive form ${id} not found`);
    return form;
  }

  private toCustomerBasic(customer: Customer | null | undefined) {
    if (!customer) return null;
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
    };
  }

  private withSanitizedCustomer(response: SurveyResponse) {
    if (!response.testDriveForm) return response as any;

    const testDriveForm: any = { ...response.testDriveForm };
    testDriveForm.customer = this.toCustomerBasic((response.testDriveForm as any).customer);

    return { ...response, testDriveForm } as any;
  }

  async start(dto: StartSurveyResponseDto): Promise<SurveyResponse> {
    const [version, testDriveForm] = await Promise.all([
      this.loadVersion(dto.surveyVersionId),
      this.loadTestDriveForm(dto.testDriveFormIdentifier),
    ]);

    const existing = await this.responsesRepository.findOne({
      where: {
        surveyVersion: { id: version.id },
        testDriveForm: { id: testDriveForm.id },
      },
    });
    if (existing) return existing;

    const response = this.responsesRepository.create({
      surveyVersion: version,
      testDriveForm,
      status: SurveyResponseStatus.STARTED,
      submittedAt: null,
    });
    return this.responsesRepository.save(response);
  }

  async findAll(filters?: {
    status?: SurveyResponseStatus;
    surveyId?: string;
    surveyVersionId?: string;
  }): Promise<any[]> {
    const qb = this.responsesRepository
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.surveyVersion', 'surveyVersion')
      .leftJoinAndSelect('surveyVersion.survey', 'survey')
      .leftJoinAndSelect('response.testDriveForm', 'testDriveForm')
      .leftJoinAndSelect('testDriveForm.customer', 'customer')
      .orderBy('response.updatedAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('response.status = :status', { status: filters.status });
    }
    if (filters?.surveyVersionId) {
      qb.andWhere('surveyVersion.id = :surveyVersionId', {
        surveyVersionId: filters.surveyVersionId,
      });
    }
    if (filters?.surveyId) {
      qb.andWhere('survey.id = :surveyId', { surveyId: filters.surveyId });
    }

    const responses = await qb.getMany();
    return responses.map((r) => this.withSanitizedCustomer(r));
  }

  async findOne(id: string): Promise<any> {
    const response = await this.responsesRepository.findOne({
      where: { id },
      relations: [
        'surveyVersion',
        'surveyVersion.survey',
        'testDriveForm',
        'testDriveForm.customer',
        'answers',
        'answers.question',
        'answers.option',
      ],
    });
    if (!response) throw new NotFoundException(`Survey response ${id} not found`);
    return this.withSanitizedCustomer(response);
  }

  async submitAnswers(
    responseId: string,
    dto: SubmitSurveyAnswersDto,
  ): Promise<SurveyResponse> {
    const response = await this.responsesRepository.findOne({
      where: { id: responseId },
      relations: ['surveyVersion'],
    });
    if (!response) throw new NotFoundException(`Survey response ${responseId} not found`);

    if (response.status === SurveyResponseStatus.SUBMITTED) {
      throw new BadRequestException('Survey response is already submitted');
    }

    const existingAnswersCount = await this.answersRepository.count({
      where: { response: { id: responseId } },
    });
    if (existingAnswersCount) {
      throw new BadRequestException('Survey response already has answers');
    }

    const questions = await this.questionsRepository.find({
      where: { surveyVersion: { id: response.surveyVersion.id } },
      relations: ['options'],
      order: { orderIndex: 'ASC' },
    });
    const questionMap = new Map<string, SurveyQuestion>(
      questions.map((q) => [q.id, q]),
    );

    const providedQuestionIds = new Set<string>();
    const createdAnswers: SurveyAnswer[] = [];

    for (const a of dto.answers) {
      const question = questionMap.get(a.questionId);
      if (!question) {
        throw new BadRequestException(
          `Question ${a.questionId} does not belong to this survey version`,
        );
      }

      if (
        providedQuestionIds.has(question.id) &&
        question.type !== SurveyQuestionType.OPTION_MULTI
      ) {
        throw new BadRequestException(`Duplicate answer for question ${question.id}`);
      }
      providedQuestionIds.add(question.id);

      if (question.type === SurveyQuestionType.NUMBER) {
        if (a.valueNumber == null) {
          throw new BadRequestException(`valueNumber is required for question ${question.id}`);
        }
        if (question.minValue != null && a.valueNumber < question.minValue) {
          throw new BadRequestException(
            `valueNumber must be >= ${question.minValue} for question ${question.id}`,
          );
        }
        if (question.maxValue != null && a.valueNumber > question.maxValue) {
          throw new BadRequestException(
            `valueNumber must be <= ${question.maxValue} for question ${question.id}`,
          );
        }

        createdAnswers.push(
          this.answersRepository.create({
            response,
            question,
            option: null,
            valueNumber: a.valueNumber,
            valueText: null,
          }),
        );
        continue;
      }

      if (question.type === SurveyQuestionType.TEXT) {
        const text = (a.valueText ?? '').trim();
        if (question.isRequired && text.length === 0) {
          throw new BadRequestException(`valueText is required for question ${question.id}`);
        }

        createdAnswers.push(
          this.answersRepository.create({
            response,
            question,
            option: null,
            valueNumber: null,
            valueText: text.length ? text : null,
          }),
        );
        continue;
      }

      if (
        question.type === SurveyQuestionType.OPTION_SINGLE ||
        question.type === SurveyQuestionType.OPTION_MULTI
      ) {
        const optionIds = a.optionIds ?? [];
        const uniqueOptionIds = Array.from(new Set(optionIds));

        if (question.isRequired && uniqueOptionIds.length === 0) {
          throw new BadRequestException(`optionIds are required for question ${question.id}`);
        }
        if (
          question.type === SurveyQuestionType.OPTION_SINGLE &&
          uniqueOptionIds.length !== 1
        ) {
          throw new BadRequestException(
            `Exactly one optionId is required for question ${question.id}`,
          );
        }

        for (const optionId of uniqueOptionIds) {
          const option = question.options?.find((o) => o.id === optionId);
          if (!option) {
            throw new BadRequestException(
              `Option ${optionId} does not belong to question ${question.id}`,
            );
          }
          createdAnswers.push(
            this.answersRepository.create({
              response,
              question,
              option,
              valueNumber: null,
              valueText: null,
            }),
          );
        }
        continue;
      }

      throw new BadRequestException(`Unsupported question type for question ${question.id}`);
    }

    const missingRequired = questions
      .filter((q) => q.isRequired)
      .filter((q) => {
        if (!providedQuestionIds.has(q.id)) return true;
        if (q.type === SurveyQuestionType.OPTION_MULTI) {
          return !createdAnswers.some((ans) => ans.question.id === q.id);
        }
        return false;
      });

    if (missingRequired.length) {
      throw new BadRequestException(
        `Missing required answers for question(s): ${missingRequired.map((q) => q.id).join(', ')}`,
      );
    }

    return this.responsesRepository.manager.transaction(async (manager) => {
      if (createdAnswers.length) {
        await manager.save(createdAnswers);
      }

      // IMPORTANT: do not `save(response)` here while `answers` might be loaded as `[]`,
      // otherwise TypeORM may try to "sync" the relation by nulling `survey_answers.responseId`.
      await manager.getRepository(SurveyResponse).update(
        { id: response.id },
        { status: SurveyResponseStatus.SUBMITTED, submittedAt: new Date() },
      );
      return this.findOne(response.id);
    });
  }
}
