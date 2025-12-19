import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDigitalSignatureDto {
  @IsString()
  @IsNotEmpty()
  signatureData: string;
}
