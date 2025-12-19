import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { SurveyBrand } from '../../../common/enums/survey-brand.enum';
import { SurveyVersion } from './survey-version.entity';

export enum SurveyStatus {
  DRAFT = 'draft',
  READY = 'ready',
}

@Entity('surveys')
export class Survey extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: SurveyBrand })
  brand: SurveyBrand;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: SurveyStatus, default: SurveyStatus.DRAFT })
  status: SurveyStatus;

  @OneToMany(() => SurveyVersion, (version) => version.survey)
  versions: SurveyVersion[];
}
