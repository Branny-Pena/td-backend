import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { TestDriveForm } from '../../test-drive-forms/entities/test-drive-form.entity';
import { SurveyAnswer } from './survey-answer.entity';
import { SurveyVersion } from './survey-version.entity';

export enum SurveyResponseStatus {
  STARTED = 'started',
  SUBMITTED = 'submitted',
}

@Entity('survey_responses')
@Unique(['surveyVersion', 'testDriveForm'])
export class SurveyResponse extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SurveyVersion, (version) => version.responses, {
    nullable: false,
  })
  surveyVersion: SurveyVersion;

  @ManyToOne(() => TestDriveForm, { nullable: false })
  testDriveForm: TestDriveForm;

  @Index()
  @Column({ type: 'enum', enum: SurveyResponseStatus })
  status: SurveyResponseStatus;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @OneToMany(() => SurveyAnswer, (answer) => answer.response)
  answers: SurveyAnswer[];
}

