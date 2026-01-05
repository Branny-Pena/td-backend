import { IsNotEmpty, IsUUID } from 'class-validator';

export class StartSurveyResponseDto {
  @IsUUID()
  @IsNotEmpty()
  surveyVersionId: string;

  @IsUUID()
  @IsNotEmpty()
  testDriveFormIdentifier: string;
}
