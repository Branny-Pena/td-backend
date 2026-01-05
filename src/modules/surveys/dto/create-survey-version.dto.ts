import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSurveyVersionDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  version: number;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
