import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { SurveyQuestionOption } from './survey-question-option.entity';
import { SurveyQuestion } from './survey-question.entity';
import { SurveyResponse } from './survey-response.entity';

@Entity('survey_answers')
@Index(['response', 'question', 'option'], {
  unique: true,
  where: '"optionId" IS NOT NULL',
})
@Index(['response', 'question'], {
  unique: true,
  where: '"optionId" IS NULL',
})
export class SurveyAnswer extends AuditableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SurveyResponse, (response) => response.answers, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  response: SurveyResponse;

  @ManyToOne(() => SurveyQuestion, { nullable: false })
  question: SurveyQuestion;

  @ManyToOne(() => SurveyQuestionOption, { nullable: true })
  option: SurveyQuestionOption | null;

  @Column({ name: 'value_number', type: 'int', nullable: true })
  valueNumber: number | null;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText: string | null;
}
