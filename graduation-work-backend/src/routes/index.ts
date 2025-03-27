import express from 'express';
import usersController from '@controllers/users';

const BASE_API_PATH = '/api/v1';

const router = express.Router();

router.use(BASE_API_PATH, usersController)

export default router;
