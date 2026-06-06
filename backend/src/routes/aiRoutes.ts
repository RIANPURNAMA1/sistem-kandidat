import { Router } from 'express';
import { chat } from '../controllers/aiController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/chat', authenticate, chat);

export default router;
