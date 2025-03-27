import bcrypt from 'bcrypt';
// import { userInfo } from 'os';

const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
export const createHashString = async (str: string) => {
    const salt = await bcrypt.genSalt(rounds);
    return await bcrypt.hash(str, salt);
};
