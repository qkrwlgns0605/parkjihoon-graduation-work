import ResponseError from '@modules/Response/ResponseError';
import { Account, AccountType } from '@config/passport';
import _ from 'lodash'

export const checkBody = (body: any, fieldNames: string[]) => {
    if (!body) throw new ResponseError.BadRequest(`다음 필드가 없습니다: ${fieldNames.join(', ')}`);
    const notIncludedFields: string[] = []

    fieldNames.forEach(field => {
        if (!body.hasOwnProperty(field)) {
            notIncludedFields.push(field)
        }
    });

    if (!_.isEmpty(notIncludedFields)) {
        throw new ResponseError.BadRequest(`다음 필드가 없습니다: ${notIncludedFields.join(', ')}`);
    }
};

export const checkPassword = (str: string) => {
    const num = str.search(/[0-9]/g);
    const eng = str.search(/[a-z]/ig);
    const spe = str.search(/[`~!@@#$%^&*|₩₩₩'₩";:₩/?]/gi);

    if (str.length < 8 || str.length > 20) {
        throw new ResponseError.NotFound('비밀번호는 최소 8자,최대 20자까지 입력 가능합니다.');
    }

    if (str.search(/₩s/) != -1) {
        throw new ResponseError.NotFound('공백을 사용하실 수 없습니다.');
    }

    if (num < 0 || eng < 0 || spe < 0) {
        throw new ResponseError.NotFound('특수문자, 숫자, 문자가 모두 포함하여 작성해야 합니다.');
    }

    return true;
};

export const checkPhone = (phone: string) => {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{4})[-. ]?([0-9]{4})$/;

    if (phone.match(phoneRegex) != null) {
        return true;
    } else {
        throw new ResponseError.NotFound('유효하지 않은 전화번호입니다.');
    }
};

export const checkAccountNormal = (jwtUser: Express.User | undefined): Account => {
    if (jwtUser) {
        const account = jwtUser as Account;

        if (account.type !== AccountType.NORMAL) {
            throw new ResponseError.BadRequest('이 API 를 사용할 수 없는 token 입니다.');
        }
        return account;
    } else {
        throw new ResponseError.BadRequest('이 API 를 사용할 수 없는 token 입니다.');
    }
}
