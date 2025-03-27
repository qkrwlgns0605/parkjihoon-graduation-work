import { ExtractJwt, Strategy as JwtStrategy, VerifiedCallback } from 'passport-jwt';
import dotenv from 'dotenv';
import User from "@models/User";

dotenv.config();

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET_ACCESS_TOKEN,
};

export enum AccountType {
    NORMAL,
    ADMIN
}

export interface Account {
    type: AccountType,
    id: number
}

export default (passport: any) => {
    passport.use(new JwtStrategy(opts, async (jwtPayload: any, done: VerifiedCallback) => {
        let error: Error | null = null;
        let account: Account | null = null;

        if (jwtPayload.type == AccountType.NORMAL) {
            try {
                if (await User.findByPk(jwtPayload.id)) {
                    account = { type: AccountType.NORMAL, id: jwtPayload.id };
                }
            } catch (e: any) {
                error = e;
            }
        }

        if (error) {
            return done(error, false);
        } else if (account) {
            return done(null, account);
        } else {
            return done(null, false);
        }
    }));
}

