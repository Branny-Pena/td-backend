import {
  Entity,
  JoinColumn,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Image } from '../../images/entities/image.entity';
import { TestDriveForm } from '../../test-drive-forms/entities/test-drive-form.entity';

@Entity('return_states')
export class ReturnState extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Image, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'mileage_image_id' })
  mileageImage?: Image | null;

  @OneToOne(() => Image, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'fuel_level_image_id' })
  fuelLevelImage?: Image | null;

  @OneToMany(() => Image, (image) => image.returnState, { persistence: false })
  images: Image[];

  @OneToOne(() => TestDriveForm, (form) => form.returnState)
  testDriveForm: TestDriveForm;
}
