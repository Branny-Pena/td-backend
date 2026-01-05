import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SurveyQuestionType } from '../entities/survey-question.entity';
import { CreateSurveyQuestionOptionDto } from './create-survey-question-option.dto';

export class CreateSurveyQuestionDto {
  @IsEnum(SurveyQuestionType)
  @IsNotEmpty()
  type: SurveyQuestionType;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsBoolean()
  @IsNotEmpty()
  isRequired: boolean;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  orderIndex: number;

  @IsOptional()
  @IsInt()
  minValue?: number;

  @IsOptional()
  @IsInt()
  maxValue?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionOptionDto)
  options?: CreateSurveyQuestionOptionDto[];
}
