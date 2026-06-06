import { Router } from 'express';
import { getFinancialReport } from '../controllers/reportController';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';

const router = Router();

router.get('/financial', authenticate, isAdmin, getFinancialReport);

export default router;
