import { SequelizeTypescriptMigration } from 'sequelize-typescript-migration';
import path from 'path';
import { sequelize } from '@models/_instance';

// sequelize-typescript-migration 에서 사용하는 Sequelize 버전이 낮아서 생기는 error 이므로 ignore 로 처리
// @ts-ignore
SequelizeTypescriptMigration.makeMigration(sequelize, {
    outDir: path.join(__dirname, '../migrations'),
    migrationName: Date.now() + '-create-tables',
    preview: false,

});
