import { PartialType } from '@nestjs/mapped-types';
import { CreateTestDriveFormDto } from './create-test-drive-form.dto';

export class UpdateTestDriveFormDto extends PartialType(
  CreateTestDriveFormDto,
) {}
