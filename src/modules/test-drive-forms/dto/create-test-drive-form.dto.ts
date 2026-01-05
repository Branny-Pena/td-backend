import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
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
  TestDriveFormStep,
} from '../entities/test-drive-form.entity';
import { ReturnStatePayloadDto } from './return-state-payload.dto';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';

export class CreateTestDriveFormDto {
  @IsOptional()
  @IsEnum(SurveyBrand)
  brand?: SurveyBrand;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsUUID()
  vehicleId?: string | null;

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

  @IsOptional()
  @IsEnum(TestDriveFormStep)
  currentStep?: TestDriveFormStep;
}
