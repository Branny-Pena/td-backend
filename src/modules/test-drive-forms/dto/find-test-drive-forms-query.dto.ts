import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';
import { TestDriveFormStatus } from '../entities/test-drive-form.entity';

export class FindTestDriveFormsQueryDto {
  @IsOptional()
  @IsEnum(TestDriveFormStatus)
  status?: TestDriveFormStatus;

  @IsOptional()
  @IsEnum(SurveyBrand)
  brand?: SurveyBrand;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  // Convenience filter (case-insensitive, partial match)
  @IsOptional()
  @IsString()
  vehicleLicensePlate?: string;

  // Convenience filter (case-insensitive, partial match)
  @IsOptional()
  @IsString()
  vehicleVinNumber?: string;
}

