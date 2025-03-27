import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  AllowNull, ForeignKey, BelongsTo
} from 'sequelize-typescript';
import Subject from './Subject';

@Table
export default class Pdf extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id!: number;

  @AllowNull(false)
  @Column
  original_name!: string;

  @AllowNull(false)
  @Column
  filename!: string;

  @ForeignKey(() => Subject)
  @AllowNull(false)
  @Column
  subject_id!: number;

  @BelongsTo(() => Subject)
  subject!: Subject;
}
