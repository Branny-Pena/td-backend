import { PartialType } from '@nestjs/mapped-types';
import { CreateCurrentLocationDto } from './create-current-location.dto';

export class UpdateCurrentLocationDto extends PartialType(
  CreateCurrentLocationDto,
) {}
