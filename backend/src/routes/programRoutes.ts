import { Router } from 'express';
import {
  listPrograms, getProgramBySlug, createProgram,
  updateProgram, deleteProgram, applyProgram,
} from '../controllers/programController';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from '../controllers/settingsController';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';

const router = Router();

// Public
router.get('/', listPrograms);
router.get('/categories', getCategories);
router.get('/:slug', getProgramBySlug);

// Protected
router.use(authenticate);
router.post('/:programId/apply', applyProgram);

// Admin only
router.post('/', isAdmin, createProgram);
router.put('/:id', isAdmin, updateProgram);
router.delete('/:id', isAdmin, deleteProgram);
router.post('/categories', isAdmin, createCategory);
router.put('/categories/:id', isAdmin, updateCategory);
router.delete('/categories/:id', isAdmin, deleteCategory);

export default router;
