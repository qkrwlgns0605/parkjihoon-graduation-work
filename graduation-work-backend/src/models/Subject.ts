import {
  Table, Column, Model, PrimaryKey, AutoIncrement,
  AllowNull, ForeignKey, BelongsTo, HasMany
} from 'sequelize-typescript';
import User from './User';
import Pdf from './Pdf';

@Table
export default class Subject extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id!: number;

  @AllowNull(false)
  @Column
  name!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  user_id!: number;

  @BelongsTo(() => User)
  user!: User;

  @HasMany(() => Pdf)
  Pdfs!: Pdf[];
}
