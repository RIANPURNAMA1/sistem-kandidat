import { Router } from 'express';
import { createCoupon, listCoupons, getCouponById, updateCoupon, deleteCoupon, validateCoupon, calculateDiscount } from '../controllers/couponController';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';

const router = Router();

// Public routes
router.get('/validate', validateCoupon);
router.post('/calculate', calculateDiscount);

// Admin routes
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), listCoupons);
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), createCoupon);
router.get('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), getCouponById);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateCoupon);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), deleteCoupon);

export default router;
