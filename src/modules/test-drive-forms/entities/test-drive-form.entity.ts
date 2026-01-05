import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { DigitalSignature } from '../../digital-signatures/entities/digital-signature.entity';
import { ReturnState } from '../../return-states/entities/return-state.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Customer } from '../../customers/entities/customers.entity';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';

export enum TestDriveFormStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
}

export enum TestDriveFormStep {
  CUSTOMER_DATA = 'CUSTOMER_DATA',
  VEHICLE_DATA = 'VEHICLE_DATA',
  SIGNATURE_DATA = 'SIGNATURE_DATA',
  VALUATION_DATA = 'VALUATION_DATA',
  VEHICLE_RETURN_DATA = 'VEHICLE_RETURN_DATA',
  FINAL_CONFIRMATION = 'FINAL_CONFIRMATION',
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

  @ManyToOne(() => Customer, (customer) => customer.testDriveForms, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  customer: Customer | null;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.testDriveForms, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  vehicle: Vehicle | null;

  @OneToOne(() => DigitalSignature, {
    cascade: true,
    nullable: true,
    eager: true,
  })
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

  @Column({
    name: 'current_step',
    type: 'enum',
    enum: TestDriveFormStep,
    default: TestDriveFormStep.CUSTOMER_DATA,
  })
  currentStep: TestDriveFormStep;
}
