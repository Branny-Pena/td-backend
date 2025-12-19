import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TestDriveForm } from '../../test-drive-forms/entities/test-drive-form.entity';

@Entity('current_locations')
export class CurrentLocation extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'location_name' })
  locationName: string;

  @OneToMany(() => TestDriveForm, (form) => form.location)
  testDriveForms: TestDriveForm[];
}
