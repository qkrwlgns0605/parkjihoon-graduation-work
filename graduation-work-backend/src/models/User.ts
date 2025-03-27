import {
    Table, Column, Model, PrimaryKey, AutoIncrement,
    AllowNull, Unique, HasMany
  } from 'sequelize-typescript';
  import Subject from './Subject';
  
  @Table
  export default class User extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column
    id!: number;
  
    @Unique
    @AllowNull(false)
    @Column
    user_id!: string;
  
    @AllowNull(false)
    @Column
    password!: string;
  
    @HasMany(() => Subject)
    subjects!: Subject[];
  }
  