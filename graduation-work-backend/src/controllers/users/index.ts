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
import { Op, col } from 'sequelize';

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

// 푼 문제 저장
usersController.post(
  '/saveQuizResult',
  passport.authenticate('jwt', { session: false }),
  expressAsyncHandler(async (req: Request, res: Response) => {
    const account = checkAccountNormal(req.user);

    const quizResults = req.body;

    if (!Array.isArray(quizResults) || quizResults.length === 0) {
      throw new ResponseError.BadRequest('저장할 퀴즈 데이터가 없습니다.');
    }

    for (const quiz of quizResults) {
      if (!quiz.question || !quiz.hint || !quiz.options || !quiz.answer_number || typeof quiz.selected_number !== 'number' || !quiz.subject_id) {
        throw new ResponseError.BadRequest('퀴즈 데이터 형식이 올바르지 않습니다.');
      }

      const subject = await models.Subject.findOne({
        where: { id: quiz.subject_id, user_id: account.id }
      });
      if (!subject) {
        throw new ResponseError.BadRequest('유효하지 않은 과목 ID입니다.');
      }

      await models.QuizHistory.create({
        question: quiz.question,
        hint: quiz.hint,
        options: quiz.options,
        answer_number: quiz.answer_number,
        selected_number: quiz.selected_number,
        subject_id: quiz.subject_id,
      });      
    }

    res.json(BuildResponse.get({ message: '퀴즈 결과 저장 완료' }));
  })
);


// 오답노트 조회
usersController.get(
  '/wrongNote/:subjectId',
  passport.authenticate('jwt', { session: false }),
  expressAsyncHandler(async (req: Request, res: Response) => {
    const account = checkAccountNormal(req.user);
    const subjectId = parseInt(req.params.subjectId, 10);

    const subject = await models.Subject.findOne({
      where: { id: subjectId, user_id: account.id }
    });
    if (!subject) {
      throw new ResponseError.NotFound('해당 과목을 찾을 수 없습니다.');
    }

    const wrongNotes = await models.QuizHistory.findAll({
      where: {
        subject_id: subjectId,
        [Op.and]: [
          { selected_number: { [Op.ne]: null } },
          { selected_number: { [Op.ne]: col('answer_number') } }
        ]
      },
      attributes: ['question', 'hint', 'options', 'answer_number', 'selected_number'],
      order: [['createdAt', 'ASC']],
    });

    res.json(wrongNotes);
  })
);


export default usersController;
