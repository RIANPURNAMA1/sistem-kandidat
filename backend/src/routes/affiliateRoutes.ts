import { Router } from 'express';
import {
  registerAffiliate, getMyAffiliate, trackClick,
  getLeaderboard, requestWithdrawal, listAffiliates, approveCommission,
  getMyPrograms, addProgram, removeProgram,
  adminGetAffiliatePrograms, adminAddProgram, adminRemoveProgram,
} from '../controllers/affiliateController';
import { authenticate } from '../middlewares/auth';
import { isAdmin, isFinance } from '../middlewares/authorize';

const router = Router();

// Public
router.get('/leaderboard', getLeaderboard);
router.post('/track/:code', trackClick);

// Protected
router.use(authenticate);
router.post('/register', registerAffiliate);
router.get('/my', getMyAffiliate);
router.get('/my/programs', getMyPrograms);
router.post('/my/programs', addProgram);
router.delete('/my/programs/:programId', removeProgram);
router.post('/withdraw', requestWithdrawal);

// Admin
router.get('/', isAdmin, listAffiliates);
router.get('/:id/programs', isAdmin, adminGetAffiliatePrograms);
router.post('/:id/programs', isAdmin, adminAddProgram);
router.delete('/:id/programs/:programId', isAdmin, adminRemoveProgram);
router.put('/commissions/:id/approve', isFinance, approveCommission);

export default router;
