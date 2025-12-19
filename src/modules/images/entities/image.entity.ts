import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { ReturnState } from '../../return-states/entities/return-state.entity';

@Entity('images')
export class Image extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @ManyToOne(() => ReturnState, (returnState) => returnState.images, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  returnState: ReturnState;
}
