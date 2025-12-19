import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDriveFormsController } from './test-drive-forms.controller';
import { TestDriveFormsService } from './test-drive-forms.service';
import { TestDriveForm } from './entities/test-drive-form.entity';
import { Customer } from '../customers/entities/customers.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { CurrentLocation } from '../locations/entities/current-location.entity';
import { DigitalSignature } from '../digital-signatures/entities/digital-signature.entity';
import { ReturnState } from '../return-states/entities/return-state.entity';
import { Image } from '../images/entities/image.entity';
import { MailerModule } from '../mailer/mailer.module';
import { SurveysModule } from '../surveys/surveys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestDriveForm,
      Customer,
      Vehicle,
      CurrentLocation,
      DigitalSignature,
      ReturnState,
      Image,
    ]),
    MailerModule,
    SurveysModule,
  ],
  controllers: [TestDriveFormsController],
  providers: [TestDriveFormsService],
  exports: [TypeOrmModule, TestDriveFormsService],
})
export class TestDriveFormsModule {}
