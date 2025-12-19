import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SubmitSurveyAnswerItemDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsOptional()
  @IsInt()
  valueNumber?: number;

  @IsOptional()
  @IsString()
  valueText?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  optionIds?: string[];
}

export class SubmitSurveyAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitSurveyAnswerItemDto)
  answers: SubmitSurveyAnswerItemDto[];
}

