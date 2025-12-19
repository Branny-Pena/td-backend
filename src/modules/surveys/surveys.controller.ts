import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { CreateSurveyVersionDto } from './dto/create-survey-version.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SurveyBrand } from '../../common/enums/survey-brand.enum';
import { SurveyVersionsService } from './survey-versions.service';
import { SurveysService } from './surveys.service';

@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly surveysService: SurveysService,
    private readonly versionsService: SurveyVersionsService,
  ) {}

  @Post()
  create(@Body() dto: CreateSurveyDto) {
    return this.surveysService.create(dto);
  }

  @Get()
  findAll() {
    return this.surveysService.findAll();
  }

  @Get('active')
  findActive(
    @Query('brand', new ParseEnumPipe(SurveyBrand)) brand: SurveyBrand,
  ) {
    return this.surveysService.findActiveByBrand(brand);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.surveysService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSurveyDto) {
    return this.surveysService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.surveysService.remove(id);
  }

  @Post(':surveyId/versions')
  createVersion(
    @Param('surveyId') surveyId: string,
    @Body() dto: CreateSurveyVersionDto,
  ) {
    return this.versionsService.createForSurvey(surveyId, dto);
  }

  @Get(':surveyId/versions')
  listVersions(@Param('surveyId') surveyId: string) {
    return this.versionsService.listForSurvey(surveyId);
  }

  @Get(':surveyId/versions/current')
  getCurrentVersion(@Param('surveyId') surveyId: string) {
    return this.versionsService.getCurrentForSurvey(surveyId);
  }
}
