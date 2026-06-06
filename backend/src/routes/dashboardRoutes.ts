import { Router } from 'express';
import {
  getAdminDashboard, getAffiliateDashboard, getFinanceDashboard,
} from '../controllers/dashboardController';
import { authenticate } from '../middlewares/auth';
import { isAdmin, isFinance } from '../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.get('/admin', isAdmin, getAdminDashboard);
router.get('/finance', isFinance, getFinanceDashboard);
router.get('/affiliate', getAffiliateDashboard);

export default router;
