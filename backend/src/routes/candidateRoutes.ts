import { Router } from 'express';
import {
  createProfile, getMyProfile, updateProfile,
  listCandidates, getCandidateById,
} from '../controllers/candidateController';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';

const router = Router();

router.use(authenticate);

// Candidate self
router.post('/profile', createProfile);
router.get('/profile', getMyProfile);
router.put('/profile', updateProfile);

// Admin
router.get('/', isAdmin, listCandidates);
router.get('/:id', isAdmin, getCandidateById);

export default router;
