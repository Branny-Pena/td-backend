import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { SurveyVersionsService } from './survey-versions.service';

@Controller('survey-versions')
export class SurveyVersionsController {
  constructor(private readonly versionsService: SurveyVersionsService) {}

  @Post(':versionId/questions')
  addQuestion(
    @Param('versionId') versionId: string,
    @Body() dto: CreateSurveyQuestionDto,
  ) {
    return this.versionsService.addQuestion(versionId, dto);
  }

  @Get(':versionId')
  getFull(@Param('versionId') versionId: string) {
    return this.versionsService.getFullVersion(versionId);
  }
}
