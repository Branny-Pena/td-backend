import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TestDriveForm } from '../../test-drive-forms/entities/test-drive-form.entity';

@Entity('customers')
export class Customer extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  dni: string;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => TestDriveForm, (form) => form.customer)
  testDriveForms: TestDriveForm[];
}
