import { Router } from 'express';
import { analyzeProof } from '../controllers/ocrController';
import { uploadPaymentProof } from '../middlewares/upload';

const router = Router();

router.post('/analyze', uploadPaymentProof, analyzeProof);

export default router;
