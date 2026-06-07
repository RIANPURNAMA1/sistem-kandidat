import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { memberAreaService } from '../services/memberAreaService';
import { catchAsync, sendSuccess, sendPaginated } from '../utils/AppError';
import { AppError } from '../utils/AppError';

// ===== CATEGORIES =====
export const getCategories = catchAsync(async (_req: Request, res: Response) => {
  const categories = await memberAreaService.getCategories();
  return sendSuccess(res, categories);
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const { name, slug, icon, color, sortOrder } = req.body;
  if (!name || !slug) throw new AppError('Nama dan slug wajib diisi', 400);
  const category = await memberAreaService.createCategory({ name, slug, icon, color, sortOrder });
  return sendSuccess(res, category, 'Kategori berhasil dibuat', 201);
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await memberAreaService.updateCategory(req.params.id as string, req.body);
  return sendSuccess(res, category);
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await memberAreaService.deleteCategory(req.params.id as string);
  return sendSuccess(res, null, 'Kategori berhasil dihapus');
});

// ===== MEMBER AREAS =====
export const getAreas = catchAsync(async (req: Request, res: Response) => {
  const { categoryId, role, search, page, limit } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;

  const areas = await memberAreaService.getAreas({
    categoryId: categoryId as string,
    role: role as any,
    search: search as string,
  });

  const paginated = areas.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  return sendPaginated(res, paginated, areas.length, pageNum, limitNum);
});

export const getAreaBySlug = catchAsync(async (req: Request, res: Response) => {
  const area = await memberAreaService.getAreaBySlug(req.params.slug as string);
  if (!area) throw new AppError('Area tidak ditemukan', 404);
  return sendSuccess(res, area);
});

export const getAreaById = catchAsync(async (req: Request, res: Response) => {
  const area = await memberAreaService.getAreaById(req.params.id as string);
  if (!area) throw new AppError('Area tidak ditemukan', 404);
  return sendSuccess(res, area);
});

export const createArea = catchAsync(async (req: Request, res: Response) => {
  const { name, slug, description, coverUrl, avatarUrl, categoryId, visibility, targetRole, maxMembers, settings } = req.body;
  if (!name || !slug) throw new AppError('Nama dan slug wajib diisi', 400);
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const area = await memberAreaService.createArea({
    name, slug, description, coverUrl, avatarUrl,
    categoryId: categoryId || undefined,
    visibility, targetRole: targetRole || undefined,
    maxMembers: maxMembers ? parseInt(maxMembers) : undefined,
    settings,
    createdById: req.user.userId,
  });
  return sendSuccess(res, area, 'Area berhasil dibuat', 201);
});

export const updateArea = catchAsync(async (req: Request, res: Response) => {
  const area = await memberAreaService.updateArea(req.params.id as string, req.body);
  return sendSuccess(res, area);
});

export const deleteArea = catchAsync(async (req: Request, res: Response) => {
  await memberAreaService.deleteArea(req.params.id as string);
  return sendSuccess(res, null, 'Area berhasil dihapus');
});

export const toggleAreaActive = catchAsync(async (req: Request, res: Response) => {
  const area = await memberAreaService.toggleAreaActive(req.params.id as string);
  return sendSuccess(res, area, area.isActive ? 'Area diaktifkan' : 'Area dinonaktifkan');
});

export const getAreaStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await memberAreaService.getAreaStats(req.params.id as string);
  return sendSuccess(res, stats);
});

export const getDashboardStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = await memberAreaService.getDashboardStats();
  return sendSuccess(res, stats);
});

// ===== MEMBERS =====
export const getMembers = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.query;
  const members = await memberAreaService.getMembers(req.params.id as string, role as any);
  return sendSuccess(res, members);
});

export const joinArea = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);
  const member = await memberAreaService.joinArea(req.params.id as string, req.user.userId);
  return sendSuccess(res, member, 'Berhasil bergabung ke area');
});

export const leaveArea = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);
  await memberAreaService.leaveArea(req.params.id as string, req.user.userId);
  return sendSuccess(res, null, 'Berhasil keluar dari area');
});

export const updateMemberRole = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!role) throw new AppError('Role wajib diisi', 400);
  const member = await memberAreaService.updateMemberRole(req.params.id as string, req.params.userId as string, role);
  return sendSuccess(res, member);
});

export const inviteMember = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);
  const { userId } = req.body;
  if (!userId) throw new AppError('User ID wajib diisi', 400);
  const member = await memberAreaService.inviteMember(req.params.id as string, userId, req.user.userId);
  return sendSuccess(res, member, 'Member berhasil diundang');
});

export const removeMember = catchAsync(async (req: Request, res: Response) => {
  await memberAreaService.removeMember(req.params.id as string, req.params.userId as string);
  return sendSuccess(res, null, 'Member berhasil dihapus');
});

export const getUserAreas = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);
  const areas = await memberAreaService.getUserAreas(req.user.userId);
  return sendSuccess(res, areas);
});

export const getAvailableUsers = catchAsync(async (req: Request, res: Response) => {
  const { search, role } = req.query;
  const where: any = { isActive: true };

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { email: { contains: search as string } },
      { phone: { contains: search as string } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
    },
    take: 50,
  });

  return sendSuccess(res, users);
});

// ===== POSTS =====
export const getPosts = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, type, search } = req.query;
  const result = await memberAreaService.getPosts(req.params.areaId as string, {
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 20,
    type: type as any,
    search: search as string,
  });
  return res.json({ success: true, ...result });
});

export const getPostById = catchAsync(async (req: Request, res: Response) => {
  const post = await memberAreaService.getPostById(req.params.postId as string);
  if (!post) throw new AppError('Post tidak ditemukan', 404);
  return sendSuccess(res, post);
});

export const createPost = catchAsync(async (req: Request, res: Response) => {
  const { title, content, type, tags } = req.body;
  if (!title || !content) throw new AppError('Judul dan konten wajib diisi', 400);
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const post = await memberAreaService.createPost({
    areaId: req.params.areaId as string,
    userId: req.user.userId,
    title, content, type, tags,
  });
  return sendSuccess(res, post, 'Post berhasil dibuat', 201);
});

export const updatePost = catchAsync(async (req: Request, res: Response) => {
  const post = await memberAreaService.updatePost(req.params.postId as string, req.body);
  return sendSuccess(res, post);
});

export const deletePost = catchAsync(async (req: Request, res: Response) => {
  await memberAreaService.deletePost(req.params.postId as string);
  return sendSuccess(res, null, 'Post berhasil dihapus');
});

export const togglePostPinned = catchAsync(async (req: Request, res: Response) => {
  const post = await memberAreaService.togglePostPinned(req.params.postId as string);
  return sendSuccess(res, post, post.isPinned ? 'Post dipinned' : 'Post diunpin');
});

export const togglePostLocked = catchAsync(async (req: Request, res: Response) => {
  const post = await memberAreaService.togglePostLocked(req.params.postId as string);
  return sendSuccess(res, post, post.isLocked ? 'Post dikunci' : 'Post dibuka');
});

// ===== COMMENTS =====
export const getComments = catchAsync(async (req: Request, res: Response) => {
  const { parentId } = req.query;
  const comments = await memberAreaService.getComments(req.params.postId as string, parentId as string);
  return sendSuccess(res, comments);
});

export const createComment = catchAsync(async (req: Request, res: Response) => {
  const { content, parentId } = req.body;
  if (!content) throw new AppError('Konten komentar wajib diisi', 400);
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const comment = await memberAreaService.createComment({
    postId: req.params.postId as string,
    userId: req.user.userId,
    content,
    parentId,
  });
  return sendSuccess(res, comment, 'Komentar berhasil dibuat', 201);
});

export const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content) throw new AppError('Konten komentar wajib diisi', 400);
  const comment = await memberAreaService.updateComment(req.params.commentId as string, content);
  return sendSuccess(res, comment);
});

export const deleteComment = catchAsync(async (req: Request, res: Response) => {
  await memberAreaService.deleteComment(req.params.commentId as string);
  return sendSuccess(res, null, 'Komentar berhasil dihapus');
});

// ===== REACTIONS =====
export const addReaction = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);
  const { emoji } = req.body;
  if (!emoji) throw new AppError('Emoji wajib diisi', 400);

  const reaction = await memberAreaService.addReaction({
    postId: req.params.postId as string,
    userId: req.user.userId,
    emoji,
  });
  return sendSuccess(res, reaction);
});

export const removeReaction = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);
  const { emoji } = req.params;
  await memberAreaService.removeReaction(req.params.postId as string, req.user.userId, emoji as string);
  return sendSuccess(res, null, 'Reaksi dihapus');
});

export const getPostReactions = catchAsync(async (req: Request, res: Response) => {
  const reactions = await memberAreaService.getPostReactions(req.params.postId as string);
  return sendSuccess(res, reactions);
});

// ===== FILES =====
export const getAreaFiles = catchAsync(async (req: Request, res: Response) => {
  const files = await memberAreaService.getAreaFiles(req.params.areaId as string);
  return sendSuccess(res, files);
});

export const createFile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);
  const { areaId, postId, fileName, fileUrl, fileSize, mimeType } = req.body;
  if (!fileName || !fileUrl || !fileSize || !mimeType) {
    throw new AppError('File data wajib diisi', 400);
  }

  const file = await memberAreaService.createFile({
    areaId, postId, userId: req.user.userId, fileName, fileUrl, fileSize, mimeType,
  });
  return sendSuccess(res, file, 'File berhasil diupload', 201);
});

export const deleteFile = catchAsync(async (req: Request, res: Response) => {
  await memberAreaService.deleteFile(req.params.fileId as string);
  return sendSuccess(res, null, 'File berhasil dihapus');
});
