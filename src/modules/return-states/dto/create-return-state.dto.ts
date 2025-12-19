import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateReturnStateDto {
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
