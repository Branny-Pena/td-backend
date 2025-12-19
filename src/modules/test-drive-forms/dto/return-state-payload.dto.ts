import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReturnStatePayloadDto {
  @IsInt()
  @Min(0)
  finalMileage: number;

  @IsInt()
  @Min(0)
  fuelLevelPercentage: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
