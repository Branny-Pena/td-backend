import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { CurrentLocation } from '../../locations/entities/current-location.entity';
import { DigitalSignature } from '../../digital-signatures/entities/digital-signature.entity';
import { ReturnState } from '../../return-states/entities/return-state.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Customer } from '../../customers/entities/customers.entity';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';

export enum TestDriveFormStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
}

export enum EstimatedPurchaseDateOption {
  ONE_MONTH = '1 mes',
  ONE_TO_THREE_MONTHS = '1 a 3 meses',
  MORE_THAN_THREE_MONTHS = 'Más de 3 meses',
}

@Entity('test_drive_forms')
export class TestDriveForm extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SurveyBrand,
    default: SurveyBrand.MERCEDES_BENZ,
  })
  brand: SurveyBrand;

  @ManyToOne(() => Customer, (customer) => customer.testDriveForms, { nullable: false })
  customer: Customer;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.testDriveForms, {
    nullable: false,
  })
  vehicle: Vehicle;

  @ManyToOne(() => CurrentLocation, (location) => location.testDriveForms, {
    nullable: false,
  })
  location: CurrentLocation;

  @OneToOne(() => DigitalSignature, { cascade: true, nullable: true, eager: true })
  @JoinColumn()
  signature: DigitalSignature | null;

  @Column({ name: 'purchase_probability', type: 'int', nullable: true })
  purchaseProbability: number | null;

  @Column({
    name: 'estimated_purchase_date',
    type: 'enum',
    enum: EstimatedPurchaseDateOption,
    nullable: true,
  })
  estimatedPurchaseDate: EstimatedPurchaseDateOption | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @OneToOne(() => ReturnState, {
    cascade: true,
    nullable: true,
    eager: true,
  })
  @JoinColumn()
  returnState: ReturnState | null;

  @Column({
    type: 'enum',
    enum: TestDriveFormStatus,
    default: TestDriveFormStatus.DRAFT,
  })
  status: TestDriveFormStatus;
}
