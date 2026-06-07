import { Router } from 'express';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getAreas, getAreaBySlug, getAreaById, createArea, updateArea, deleteArea, toggleAreaActive, getAreaStats, getDashboardStats,
  getMembers, joinArea, leaveArea, updateMemberRole, inviteMember, removeMember, getUserAreas, getAvailableUsers,
  getPosts, getPostById, createPost, updatePost, deletePost, togglePostPinned, togglePostLocked,
  getComments, createComment, updateComment, deleteComment,
  addReaction, removeReaction, getPostReactions,
  getAreaFiles, createFile, deleteFile,
} from '../controllers/memberAreaController';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';

const router = Router();

// ===== CATEGORIES =====
router.get('/categories', getCategories);
router.post('/categories', authenticate, isAdmin, createCategory);
router.put('/categories/:id', authenticate, isAdmin, updateCategory);
router.delete('/categories/:id', authenticate, isAdmin, deleteCategory);

// ===== MEMBER AREAS =====
router.get('/', getAreas);
router.get('/slug/:slug', getAreaBySlug);
router.get('/dashboard', getDashboardStats);
router.get('/my', authenticate, getUserAreas);
router.post('/', authenticate, createArea);
router.get('/:id', getAreaById);
router.put('/:id', authenticate, updateArea);
router.delete('/:id', authenticate, isAdmin, deleteArea);
router.patch('/:id/toggle-active', authenticate, isAdmin, toggleAreaActive);
router.get('/:id/stats', authenticate, getAreaStats);

// ===== MEMBERS =====
router.get('/users/available', authenticate, getAvailableUsers);
router.get('/:id/members', authenticate, getMembers);
router.post('/:id/join', authenticate, joinArea);
router.post('/:id/leave', authenticate, leaveArea);
router.post('/:id/invite', authenticate, inviteMember);
router.put('/:id/members/:userId', authenticate, updateMemberRole);
router.delete('/:id/members/:userId', authenticate, removeMember);

// ===== POSTS =====
router.get('/:areaId/posts', getPosts);
router.post('/:areaId/posts', authenticate, createPost);
router.get('/:areaId/posts/:postId', getPostById);
router.put('/:areaId/posts/:postId', authenticate, updatePost);
router.delete('/:areaId/posts/:postId', authenticate, deletePost);
router.patch('/:areaId/posts/:postId/pin', authenticate, togglePostPinned);
router.patch('/:areaId/posts/:postId/lock', authenticate, togglePostLocked);

// ===== COMMENTS =====
router.get('/:areaId/posts/:postId/comments', getComments);
router.post('/:areaId/posts/:postId/comments', authenticate, createComment);
router.put('/:areaId/posts/:postId/comments/:commentId', authenticate, updateComment);
router.delete('/:areaId/posts/:postId/comments/:commentId', authenticate, deleteComment);

// ===== REACTIONS =====
router.post('/:areaId/posts/:postId/reactions', authenticate, addReaction);
router.delete('/:areaId/posts/:postId/reactions/:emoji', authenticate, removeReaction);
router.get('/:areaId/posts/:postId/reactions', getPostReactions);

// ===== FILES =====
router.get('/:areaId/files', getAreaFiles);
router.post('/:areaId/files', authenticate, createFile);
router.delete('/:areaId/files/:fileId', authenticate, deleteFile);

export default router;
