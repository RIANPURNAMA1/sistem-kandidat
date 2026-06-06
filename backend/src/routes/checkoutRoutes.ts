import { Router } from 'express';
import { getCheckoutSettings, getCheckoutSetting, createCheckoutSetting, updateCheckoutSetting, deleteCheckoutSetting, getPublicCheckoutForm, submitCheckoutForm } from '../controllers/checkoutController';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/authorize';
import { uploadPaymentProof } from '../middlewares/upload';

const router = Router();

// Public routes
router.get('/public/:slug', getPublicCheckoutForm);
router.post('/public/:slug/submit', uploadPaymentProof, submitCheckoutForm);

// Admin routes
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), getCheckoutSettings);
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), createCheckoutSetting);
router.get('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), getCheckoutSetting);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateCheckoutSetting);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), deleteCheckoutSetting);

export default router;
