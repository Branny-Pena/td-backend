import { PartialType } from '@nestjs/mapped-types';
import { CreateDigitalSignatureDto } from './create-digital-signature.dto';

export class UpdateDigitalSignatureDto extends PartialType(
  CreateDigitalSignatureDto,
) {}
