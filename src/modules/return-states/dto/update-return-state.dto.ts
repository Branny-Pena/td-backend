import { PartialType } from '@nestjs/mapped-types';
import { CreateReturnStateDto } from './create-return-state.dto';

export class UpdateReturnStateDto extends PartialType(CreateReturnStateDto) {}
