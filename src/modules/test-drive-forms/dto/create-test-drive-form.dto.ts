import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  EstimatedPurchaseDateOption,
  TestDriveFormStatus,
} from '../entities/test-drive-form.entity';
import { ReturnStatePayloadDto } from './return-state-payload.dto';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';

export class CreateTestDriveFormDto {
  @IsOptional()
  @IsEnum(SurveyBrand)
  brand?: SurveyBrand;

  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @IsOptional()
  @IsString()
  signatureData?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  purchaseProbability?: number;

  @IsOptional()
  @IsEnum(EstimatedPurchaseDateOption)
  estimatedPurchaseDate?: EstimatedPurchaseDateOption;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReturnStatePayloadDto)
  returnState?: ReturnStatePayloadDto;

  @IsOptional()
  @IsEnum(TestDriveFormStatus)
  status?: TestDriveFormStatus;
}
