import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo,
  DataType,
} from 'sequelize-typescript';
import Subject from './Subject';

@Table
export default class QuizHistory extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id!: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  question!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  hint!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)  
  options!: string;

  @AllowNull(false)
  @Column
  answer_number!: string;

  @AllowNull(false)
  @Column
  selected_number!: number;

  @ForeignKey(() => Subject)
  @AllowNull(false)
  @Column
  subject_id!: number;

  @BelongsTo(() => Subject)
  subject!: Subject;
}
