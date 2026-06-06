import { Router } from 'express';
import {
  uploadProof, verifyPayment, listPayments, getMyPayments, bulkVerifyPayments, autoVerifyPayments, getPendingPaymentCount, getInvoice,
} from '../controllers/paymentController';
import { authenticate } from '../middlewares/auth';
import { isFinance } from '../middlewares/authorize';
import { uploadPaymentProof } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.get('/my', getMyPayments);
router.get('/:paymentId/invoice', getInvoice);
router.post('/:paymentId/upload-proof', uploadPaymentProof, uploadProof);

// Finance / Admin
router.get('/', isFinance, listPayments);
router.get('/pending-count', isFinance, getPendingPaymentCount);
router.post('/auto-verify', isFinance, autoVerifyPayments);
router.post('/bulk-verify', isFinance, bulkVerifyPayments);
router.put('/:paymentId/verify', isFinance, verifyPayment);

export default router;
