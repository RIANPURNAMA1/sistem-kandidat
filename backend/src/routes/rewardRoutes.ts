import { Router } from 'express';
import {
  getRewards, createReward, updateReward, deleteReward,
  getRedemptions, updateRedemptionStatus,
} from '../controllers/rewardController';
import { authenticate } from '../middlewares/auth';
import { isAdmin, isAffiliate } from '../middlewares/authorize';
import { getMyPoints, getMyRedemptions, redeemReward } from '../controllers/rewardController';

const router = Router();

// Public / authenticated
router.get('/', getRewards);

// Affiliate
router.get('/my-points', authenticate, isAffiliate, getMyPoints);
router.get('/my-redemptions', authenticate, isAffiliate, getMyRedemptions);
router.post('/redeem', authenticate, isAffiliate, redeemReward);

// Admin
router.post('/', authenticate, isAdmin, createReward);
router.put('/:id', authenticate, isAdmin, updateReward);
router.delete('/:id', authenticate, isAdmin, deleteReward);
router.get('/redemptions', authenticate, isAdmin, getRedemptions);
router.put('/redemptions/:id', authenticate, isAdmin, updateRedemptionStatus);

export default router;
