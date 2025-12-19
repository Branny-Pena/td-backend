import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalSignaturesController } from './digital-signatures.controller';
import { DigitalSignaturesService } from './digital-signatures.service';
import { DigitalSignature } from './entities/digital-signature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DigitalSignature])],
  controllers: [DigitalSignaturesController],
  providers: [DigitalSignaturesService],
  exports: [TypeOrmModule, DigitalSignaturesService],
})
export class DigitalSignaturesModule {}
