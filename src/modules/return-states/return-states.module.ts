import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnStatesController } from './return-states.controller';
import { ReturnStatesService } from './return-states.service';
import { ReturnState } from './entities/return-state.entity';
import { Image } from '../images/entities/image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReturnState, Image])],
  controllers: [ReturnStatesController],
  providers: [ReturnStatesService],
  exports: [TypeOrmModule, ReturnStatesService],
})
export class ReturnStatesModule {}
