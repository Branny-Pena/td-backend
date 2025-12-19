import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(SurveyBrand)
  @IsNotEmpty()
  brand: SurveyBrand;
}
