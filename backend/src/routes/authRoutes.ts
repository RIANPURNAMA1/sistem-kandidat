import { Router } from 'express';
import { register, registerAffiliate, registerWithPayment, login, getMe, changePassword, sendOtp, verifyOtp } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { uploadPaymentProof } from '../middlewares/upload';

const router = Router();

router.post('/register', register);
router.post('/register/affiliate', registerAffiliate);
router.post('/register-with-payment', uploadPaymentProof, registerWithPayment);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

export default router;
