import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TestDriveForm } from '../../test-drive-forms/entities/test-drive-form.entity';

export enum VehicleRegisterStatus {
  IN_PROGRESS = 'in progress',
  CONFIRMED = 'confirmed',
}

@Entity('vehicles')
export class Vehicle extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column({ name: 'license_plate', unique: true })
  licensePlate: string;

  @Column({ name: 'vin_number', unique: true })
  vinNumber: string;

  @Column({
    name: 'register_status',
    type: 'enum',
    enum: VehicleRegisterStatus,
    default: VehicleRegisterStatus.CONFIRMED,
  })
  registerStatus: VehicleRegisterStatus;

  @OneToMany(() => TestDriveForm, (form) => form.vehicle)
  testDriveForms: TestDriveForm[];
}
