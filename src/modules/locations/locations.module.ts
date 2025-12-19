import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { CurrentLocation } from './entities/current-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CurrentLocation])],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [TypeOrmModule, LocationsService],
})
export class LocationsModule {}
