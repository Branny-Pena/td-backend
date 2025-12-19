import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateDigitalSignatureDto } from './dto/create-digital-signature.dto';
import { UpdateDigitalSignatureDto } from './dto/update-digital-signature.dto';
import { DigitalSignaturesService } from './digital-signatures.service';

@Controller('digital-signatures')
export class DigitalSignaturesController {
  constructor(
    private readonly digitalSignaturesService: DigitalSignaturesService,
  ) {}

  @Post()
  create(@Body() dto: CreateDigitalSignatureDto) {
    return this.digitalSignaturesService.create(dto);
  }

  @Get()
  findAll() {
    return this.digitalSignaturesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.digitalSignaturesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDigitalSignatureDto) {
    return this.digitalSignaturesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.digitalSignaturesService.remove(id);
  }
}
