import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Post('/find-or-create')
  async findOrCreate(@Body() dto: CreateVehicleDto) {
    const { vehicle, created } = await this.vehiclesService.findOrCreate(dto);
    return { vehicle, created };
  }

  @Get()
  find(
    @Query('licensePlate') licensePlate?: string,
    @Query('vinNumber') vinNumber?: string,
  ) {
    if (licensePlate || vinNumber) {
      return this.vehiclesService.findByQuery(licensePlate, vinNumber);
    }
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
