import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendTestDriveReportDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
