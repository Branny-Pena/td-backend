import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDigitalSignatureDto } from './dto/create-digital-signature.dto';
import { UpdateDigitalSignatureDto } from './dto/update-digital-signature.dto';
import { DigitalSignature } from './entities/digital-signature.entity';

@Injectable()
export class DigitalSignaturesService {
  constructor(
    @InjectRepository(DigitalSignature)
    private readonly signaturesRepository: Repository<DigitalSignature>,
  ) {}

  create(dto: CreateDigitalSignatureDto): Promise<DigitalSignature> {
    const signature = this.signaturesRepository.create(dto);
    return this.signaturesRepository.save(signature);
  }

  findAll(): Promise<DigitalSignature[]> {
    return this.signaturesRepository.find();
  }

  async findOne(id: string): Promise<DigitalSignature> {
    const signature = await this.signaturesRepository.findOne({
      where: { id },
    });
    if (!signature) {
      throw new NotFoundException(`Digital signature ${id} not found`);
    }
    return signature;
  }

  async update(
    id: string,
    dto: UpdateDigitalSignatureDto,
  ): Promise<DigitalSignature> {
    const signature = await this.findOne(id);
    Object.assign(signature, dto);
    return this.signaturesRepository.save(signature);
  }

  async remove(id: string): Promise<void> {
    const result = await this.signaturesRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Digital signature ${id} not found`);
    }
  }
}
