import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateReturnStateDto } from './dto/create-return-state.dto';
import { UpdateReturnStateDto } from './dto/update-return-state.dto';
import { ReturnStatesService } from './return-states.service';

@Controller('return-states')
export class ReturnStatesController {
  constructor(private readonly returnStatesService: ReturnStatesService) {}

  @Post()
  create(@Body() dto: CreateReturnStateDto) {
    return this.returnStatesService.create(dto);
  }

  @Get()
  findAll() {
    return this.returnStatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.returnStatesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReturnStateDto) {
    return this.returnStatesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.returnStatesService.remove(id);
  }
}
