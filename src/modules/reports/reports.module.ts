import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '../mailer/mailer.module';
import { TestDriveForm } from '../test-drive-forms/entities/test-drive-form.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([TestDriveForm]), MailerModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
