import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReturnStatePayloadDto {
  @IsString()
  @IsNotEmpty()
  mileageImageUrl: string;

  @IsString()
  @IsNotEmpty()
  fuelLevelImageUrl: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
