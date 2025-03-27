import express, { Request, Response, Router } from 'express';
import { checkAccountNormal } from '@utils/validators';
import User from '@models/User';
import BuildResponse from '@modules/Response/BuildResponse';
import ResponseError from '@modules/Response/ResponseError';
import expressAsyncHandler from 'express-async-handler';
import passport from 'passport';
import { tokenizeAfterComparing } from '@utils/tokenizer';
import { AccountType } from '@config/passport';
import models from '@models/index';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const usersController = Router();

// 로그인 및 토큰 발급
usersController.post(
  '/auth',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { id, password } = req.body;
    const user = await User.findOne({ where: { user_id: id } });
    if (!user) throw new ResponseError.NotFound('계정을 찾을 수 없습니다.');

    const payload = { type: AccountType.NORMAL, id: user.id };
    const accessToken = await tokenizeAfterComparing(password, user.password, payload);
    const data = { accessToken };
    res.json(BuildResponse.get({ data }));
  })
);

// Multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "uploads/")
  },
  filename: function (req, file, callback) {
    callback(null, Date.now() + '_' + file.originalname);
  }
});

const upload = multer({ storage });

// PDF 업로드
usersController.post(
    '/uploadPdf',
    passport.authenticate('jwt', { session: false }),
    upload.single('pdf'),
    expressAsyncHandler(async (req: Request, res: Response) => {
      console.log(req.body)
      const account = checkAccountNormal(req.user);
      const subjectId = parseInt(req.body.subjectId);
  
      if (!req.file) {
        throw new ResponseError.BadRequest('파일이 업로드되지 않았습니다.');
      }
  
      if (!subjectId) {
        throw new ResponseError.BadRequest('과목 ID가 누락되었습니다.');
      }
  
      // 여기서 subjectId를 이용해 DB에 저장
      await models.Pdf.create({
          original_name: req.file.originalname, 
          filename: req.file.filename,
          subject_id: subjectId
      });
  
      res.json(BuildResponse.get({ message: '업로드 성공', filename: req.file.originalname }));
    })
  );
  

// PDF 목록 조회
usersController.get(
    '/pdfList/:subjectId',
    passport.authenticate('jwt', { session: false }),
    expressAsyncHandler(async (req: Request, res: Response) => {
      const account = checkAccountNormal(req.user);
      const subjectId = parseInt(req.params.subjectId, 10);
  
      const subject = await models.Subject.findOne({
        where: { id: subjectId, user_id: account.id }
      });
      if (!subject) throw new ResponseError.NotFound('해당 과목을 찾을 수 없습니다.');
  
      const pdfs = await models.Pdf.findAll({
        where: { subject_id: subjectId },
        attributes: ['id', 'original_name', 'filename'],
        order: [['createdAt', 'ASC']]
      });
      console.log(pdfs)
      res.json(BuildResponse.get({ pdfs }));
    })
  );
  

// 사용자의 전체 과목 리스트 조회
usersController.get(
    '/subjectList',
    passport.authenticate('jwt', { session: false }),
    expressAsyncHandler(async (req: Request, res: Response) => {
      const account = checkAccountNormal(req.user);
      const subjects = await models.Subject.findAll({
        where: { user_id: account.id },
        attributes: ['id', 'name'],
        order: [['createdAt', 'ASC']]
      });
      console.log(subjects)
      res.json(BuildResponse.get({ subjects }));
    })
  );

export default usersController;
