import { Body, Controller, Get, Param, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { StartSurveyResponseDto } from './dto/start-survey-response.dto';
import { SubmitSurveyAnswersDto } from './dto/submit-survey-answers.dto';
import { SurveyResponsesService } from './survey-responses.service';
import { SurveyResponseStatus } from './entities/survey-response.entity';

@Controller('survey-responses')
export class SurveyResponsesController {
  constructor(private readonly responsesService: SurveyResponsesService) {}

  @Get()
  findAll(
    @Query('status', new ParseEnumPipe(SurveyResponseStatus, { optional: true }))
    status?: SurveyResponseStatus,
    @Query('surveyId') surveyId?: string,
    @Query('surveyVersionId') surveyVersionId?: string,
  ) {
    return this.responsesService.findAll({ status, surveyId, surveyVersionId });
  }

  @Post()
  start(@Body() dto: StartSurveyResponseDto) {
    return this.responsesService.start(dto);
  }

  @Post(':responseId/answers')
  submitAnswers(
    @Param('responseId') responseId: string,
    @Body() dto: SubmitSurveyAnswersDto,
  ) {
    return this.responsesService.submitAnswers(responseId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.responsesService.findOne(id);
  }
}
