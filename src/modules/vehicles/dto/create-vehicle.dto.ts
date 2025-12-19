import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleRegisterStatus } from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @IsString()
  @IsNotEmpty()
  vinNumber: string;

  @IsOptional()
  @IsEnum(VehicleRegisterStatus)
  registerStatus?: VehicleRegisterStatus;
}
