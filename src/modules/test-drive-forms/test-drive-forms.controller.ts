import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateTestDriveFormDto } from './dto/create-test-drive-form.dto';
import { FindTestDriveFormsQueryDto } from './dto/find-test-drive-forms-query.dto';
import { UpdateTestDriveFormDto } from './dto/update-test-drive-form.dto';
import { TestDriveFormsService } from './test-drive-forms.service';

@Controller('test-drive-forms')
export class TestDriveFormsController {
  constructor(private readonly testDriveFormsService: TestDriveFormsService) {}

  @Post()
  create(@Body() dto: CreateTestDriveFormDto) {
    return this.testDriveFormsService.create(dto);
  }

  @Get()
  findAll(@Query() query: FindTestDriveFormsQueryDto) {
    return this.testDriveFormsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testDriveFormsService.findOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdf = await this.testDriveFormsService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="test-drive-form-${id}.pdf"`,
    );
    return new StreamableFile(pdf);
  }

  @Post(':id/email')
  sendEmail(@Param('id') id: string) {
    return this.testDriveFormsService.sendSummaryEmail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTestDriveFormDto) {
    return this.testDriveFormsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testDriveFormsService.remove(id);
  }
}
