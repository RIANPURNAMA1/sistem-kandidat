import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';
import {
  listCategories, getCategory, createCategory, updateCategory, deleteCategory,
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  sendFollowUp, listLogs,
} from '../controllers/followUpController';

const router = Router();

// Categories
router.get('/categories', authenticate, isAdmin, listCategories);
router.get('/categories/:id', authenticate, isAdmin, getCategory);
router.post('/categories', authenticate, isAdmin, createCategory);
router.put('/categories/:id', authenticate, isAdmin, updateCategory);
router.delete('/categories/:id', authenticate, isAdmin, deleteCategory);

// Templates
router.get('/templates', authenticate, isAdmin, listTemplates);
router.get('/templates/:id', authenticate, isAdmin, getTemplate);
router.post('/templates', authenticate, isAdmin, createTemplate);
router.put('/templates/:id', authenticate, isAdmin, updateTemplate);
router.delete('/templates/:id', authenticate, isAdmin, deleteTemplate);

// Send & Logs
router.post('/send', authenticate, isAdmin, sendFollowUp);
router.get('/logs', authenticate, isAdmin, listLogs);

export default router;
