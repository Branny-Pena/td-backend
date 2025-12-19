import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';
import { SurveyStatus } from '../entities/survey.entity';

export class UpdateSurveyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(SurveyBrand)
  brand?: SurveyBrand;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus;
}
