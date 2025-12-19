import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Image } from '../../images/entities/image.entity';
import { TestDriveForm } from '../../test-drive-forms/entities/test-drive-form.entity';

@Entity('return_states')
export class ReturnState extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'final_mileage', type: 'int' })
  finalMileage: number;

  @Column({ name: 'fuel_level_percentage', type: 'int' })
  fuelLevelPercentage: number;

  @OneToMany(() => Image, (image) => image.returnState, { cascade: true })
  images: Image[];

  @OneToOne(() => TestDriveForm, (form) => form.returnState)
  testDriveForm: TestDriveForm;
}
