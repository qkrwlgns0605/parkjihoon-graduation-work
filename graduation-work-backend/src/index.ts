import express, { NextFunction, Request, Response } from 'express';
import router from '@routes/index';
import path from "path";
import http from 'http'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
import session from 'express-session';
import passport from 'passport'
import passportConfig from '@config/passport'
import flash from 'connect-flash';
const LocalStrategy = require('passport-local').Strategy;
import cookieParser from 'cookie-parser';
import bcrypt from "bcrypt";
import { sequelize } from "@models/_instance"; 

dotenv.config()

/*
onListening
 : Print Set Port
*/
function onListening() {
    console.log(`Listening on port ${port}`);
}

/*
  OnError
  : Server Listen Error 
*/
function onError(error: { syscall: string; code: any }) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = `Port ${port}`;
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(`${bind} requires elevated privileges`);
            process.exit(1)
        case 'EADDRINUSE':
            console.error(`${bind} is already in use`);
            process.exit(1)
        default:
            throw error;
    }
}

/*
  normalizePort
  : Port Normalize Function
*/
function normalizePort(val: string) {
    const port = parseInt(val, 10);
    if (Number.isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}

const app = express()

const port = normalizePort(process.env.PORT || '1108');

app.set('port', port);

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err);
    });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

if (process.env.NODE_ENV === 'development') {
    const morgan = require('morgan');
    app.use(morgan('dev')) // 서버로 들어오는 request 를 로그로 남김
}

app.use(helmet.dnsPrefetchControl());
app.use(helmet.expectCt());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());
app.use(cors());

app.use('/static', express.static(__dirname + '/../static/')); // public files.
app.use('/uploads', express.static(__dirname + '/../uploads/')); // public files.

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PassPort initialize
app.use(passport.initialize());
passportConfig(passport);

app.use(router)

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
    console.log(err);
    res.status(err.statusCode || 400)
       .json({
           code: err.statusCode || 400,
           message: err.message || 'Unknown Error',
       });
});

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => res.status(404).json({
    code: 404,
    message: 'Not Found API'
}));

const server = http.createServer(app);
server.listen(port, onListening);
server.on('error', onError);

export default app;