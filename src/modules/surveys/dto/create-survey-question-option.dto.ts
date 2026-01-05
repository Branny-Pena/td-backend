import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSurveyQuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
