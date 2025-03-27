import { Sequelize } from 'sequelize-typescript';
import models from '.';

const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];

export const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        ...config,
        timezone: "+09:00",
        logQueryParameters: true,
        models: Object.values(models),
        define: {
            freezeTableName: true
        }
    },
);
