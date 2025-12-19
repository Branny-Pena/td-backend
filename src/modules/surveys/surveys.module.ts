import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDriveForm } from '../test-drive-forms/entities/test-drive-form.entity';
import { SurveyAnswer } from './entities/survey-answer.entity';
import { SurveyQuestionOption } from './entities/survey-question-option.entity';
import { SurveyQuestion } from './entities/survey-question.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { SurveyVersion } from './entities/survey-version.entity';
import { Survey } from './entities/survey.entity';
import { SurveyResponsesController } from './survey-responses.controller';
import { SurveyResponsesService } from './survey-responses.service';
import { SurveyAutomationService } from './survey-automation.service';
import { SurveyVersionsController } from './survey-versions.controller';
import { SurveyVersionsService } from './survey-versions.service';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Survey,
      SurveyVersion,
      SurveyQuestion,
      SurveyQuestionOption,
      SurveyResponse,
      SurveyAnswer,
      TestDriveForm,
    ]),
  ],
  controllers: [
    SurveysController,
    SurveyVersionsController,
    SurveyResponsesController,
  ],
  providers: [
    SurveysService,
    SurveyVersionsService,
    SurveyResponsesService,
    SurveyAutomationService,
  ],
  exports: [SurveyAutomationService],
})
export class SurveysModule {}
