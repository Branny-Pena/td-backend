import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { SurveyVersion } from './survey-version.entity';
import { SurveyQuestionOption } from './survey-question-option.entity';

export enum SurveyQuestionType {
  NUMBER = 'number',
  TEXT = 'text',
  OPTION_SINGLE = 'option_single',
  OPTION_MULTI = 'option_multi',
}

@Entity('survey_questions')
export class SurveyQuestion extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SurveyVersion, (version) => version.questions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  surveyVersion: SurveyVersion;

  @Column({ type: 'enum', enum: SurveyQuestionType })
  type: SurveyQuestionType;

  @Column({ type: 'text' })
  label: string;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @Column({ name: 'min_value', type: 'int', nullable: true })
  minValue: number | null;

  @Column({ name: 'max_value', type: 'int', nullable: true })
  maxValue: number | null;

  @OneToMany(() => SurveyQuestionOption, (option) => option.question, {
    cascade: true,
  })
  options: SurveyQuestionOption[];
}
