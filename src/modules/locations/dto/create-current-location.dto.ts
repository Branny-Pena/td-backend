import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCurrentLocationDto {
  @IsString()
  @IsNotEmpty()
  locationName: string;
}
