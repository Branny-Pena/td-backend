import { Body, Controller, Post } from '@nestjs/common';
import { SendTestDriveReportDto } from './dto/send-test-drive-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('test-drive-forms/excel-email')
  sendTestDriveReport(@Body() dto: SendTestDriveReportDto) {
    return this.reportsService.sendTestDriveReport(dto);
  }
}
