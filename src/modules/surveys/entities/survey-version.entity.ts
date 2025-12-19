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
import { Survey } from './survey.entity';
import { SurveyQuestion } from './survey-question.entity';
import { SurveyResponse } from './survey-response.entity';

@Entity('survey_versions')
@Unique(['survey', 'version'])
export class SurveyVersion extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Survey, (survey) => survey.versions, { nullable: false })
  survey: Survey;

  @Column({ type: 'int' })
  version: number;

  @Index()
  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => SurveyQuestion, (question) => question.surveyVersion)
  questions: SurveyQuestion[];

  @OneToMany(() => SurveyResponse, (response) => response.surveyVersion)
  responses: SurveyResponse[];
}

