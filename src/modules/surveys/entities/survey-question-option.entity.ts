import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity('survey_question_options')
@Unique(['question', 'value'])
export class SurveyQuestionOption extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SurveyQuestion, (question) => question.options, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  question: SurveyQuestion;

  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ name: 'order_index', type: 'int', nullable: true })
  orderIndex: number | null;
}

