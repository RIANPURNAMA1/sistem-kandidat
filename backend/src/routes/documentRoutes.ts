import { Router } from 'express';
import {
  uploadDocument, getMyDocuments, verifyDocument, deleteDocument,
} from '../controllers/documentController';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';
import { uploadDocument as uploadMiddleware } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware, uploadDocument);
router.get('/my', getMyDocuments);
router.delete('/:id', deleteDocument);
router.put('/:id/verify', isAdmin, verifyDocument);

export default router;
