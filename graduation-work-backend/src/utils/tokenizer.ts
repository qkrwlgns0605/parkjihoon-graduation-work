import bcrypt from "bcrypt";
import ResponseError from "@modules/Response/ResponseError";
import jwt from "jsonwebtoken";
import ms from "ms";

require('dotenv').config();

const { JWT_SECRET_ACCESS_TOKEN } = process.env;
const JWT_ACCESS_TOKEN_EXPIRED = process.env.JWT_ACCESS_TOKEN_EXPIRED || '1y';
const expiresIn = ms(JWT_ACCESS_TOKEN_EXPIRED) / 1000;

export const tokenizeAfterComparing = async (candidatePassword: string, password: string | undefined, payload: any) => {
    if (await bcrypt.compareSync(candidatePassword, password || '')) {
        return tokenize(payload);
    } else {
        throw new ResponseError.BadRequest('아이디 혹은 비밀번호가 잘못 되었습니다.');
    }
}

export const tokenize = (payload: any) => {
    return jwt.sign(
        JSON.parse(JSON.stringify(payload)),
        JWT_SECRET_ACCESS_TOKEN!!,
        { expiresIn },
    );
}