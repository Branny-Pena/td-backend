import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { Image } from './entities/image.entity';
import { ReturnState } from '../return-states/entities/return-state.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Image, ReturnState])],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [TypeOrmModule, ImagesService],
})
export class ImagesModule {}
