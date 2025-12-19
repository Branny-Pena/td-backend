import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

@Entity('digital_signatures')
export class DigitalSignature extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'signature_data' })
  signatureData: string;
}
