import { prisma } from '../config/database';
import { MemberAreaVisibility, MemberAreaRole, PostType, Role as UserRole } from '@prisma/client';

interface CreateAreaInput {
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  categoryId?: string;
  visibility: MemberAreaVisibility;
  targetRole?: UserRole;
  maxMembers?: number;
  settings?: Record<string, any>;
  createdById: string;
}

interface UpdateAreaInput {
  name?: string;
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  categoryId?: string;
  visibility?: MemberAreaVisibility;
  targetRole?: UserRole;
  maxMembers?: number;
  settings?: Record<string, any>;
  isActive?: boolean;
}

interface CreatePostInput {
  areaId: string;
  userId: string;
  title: string;
  content: string;
  type?: PostType;
  tags?: string;
}

interface UpdatePostInput {
  title?: string;
  content?: string;
  tags?: string;
  isPinned?: boolean;
  isLocked?: boolean;
}

interface CreateCommentInput {
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
}

interface CreateReactionInput {
  postId: string;
  userId: string;
  emoji: string;
}

export const memberAreaService = {
  // ===== CATEGORIES =====
  async getCategories() {
    return prisma.memberAreaCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async createCategory(data: { name: string; slug: string; icon?: string; color?: string; sortOrder?: number }) {
    return prisma.memberAreaCategory.create({ data });
  },

  async updateCategory(id: string, data: { name?: string; icon?: string; color?: string; sortOrder?: number; isActive?: boolean }) {
    return prisma.memberAreaCategory.update({ where: { id }, data });
  },

  async deleteCategory(id: string) {
    return prisma.memberAreaCategory.delete({ where: { id } });
  },

  // ===== MEMBER AREAS =====
  async getAreas(filters?: { categoryId?: string; role?: UserRole; search?: string }) {
    const where: any = { isActive: true };
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const areas = await prisma.memberArea.findMany({
      where,
      include: {
        category: true,
        _count: { select: { members: true, posts: true, files: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add referral stats for each area
    const areasWithStats = await Promise.all(areas.map(async (area) => {
      const members = await prisma.memberAreaMember.findMany({
        where: { areaId: area.id, isActive: true },
        select: { userId: true },
      });

      const affiliateCodes = (await Promise.all(
        members.map(m => prisma.affiliate.findUnique({ where: { userId: m.userId }, select: { code: true } }))
      )).filter(Boolean).map(a => a!.code);

      const [totalReferrals, totalReferralRevenue] = affiliateCodes.length > 0 ? await Promise.all([
        prisma.candidate.count({ where: { referredBy: { in: affiliateCodes } } }),
        prisma.payment.aggregate({
          where: { status: 'VALID', candidate: { referredBy: { in: affiliateCodes } } },
          _sum: { amount: true },
        }),
      ]) : [0, { _sum: { amount: 0 } }];

      return {
        ...area,
        stats: {
          totalReferrals,
          totalReferralRevenue: Number(totalReferralRevenue._sum.amount || 0),
        },
      };
    }));

    return areasWithStats;
  },

  async getAreaBySlug(slug: string) {
    return prisma.memberArea.findUnique({
      where: { slug },
      include: {
        category: true,
        _count: { select: { members: true, posts: true, files: true } },
      },
    });
  },

  async getAreaById(id: string) {
    return prisma.memberArea.findUnique({
      where: { id },
      include: {
        category: true,
        _count: { select: { members: true, posts: true, files: true } },
      },
    });
  },

  async createArea(data: CreateAreaInput) {
    return prisma.$transaction(async (tx: any) => {
      const area = await tx.memberArea.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          coverUrl: data.coverUrl,
          avatarUrl: data.avatarUrl,
          categoryId: data.categoryId,
          visibility: data.visibility,
          targetRole: data.targetRole,
          maxMembers: data.maxMembers,
          settings: data.settings ? (data.settings as any) : null,
        },
      });

      // Creator becomes OWNER
      await tx.memberAreaMember.create({
        data: {
          areaId: area.id,
          userId: data.createdById,
          role: MemberAreaRole.OWNER,
        },
      });

      return area;
    });
  },

  async updateArea(id: string, data: UpdateAreaInput) {
    return prisma.memberArea.update({ where: { id }, data });
  },

  async deleteArea(id: string) {
    return prisma.memberArea.delete({ where: { id } });
  },

  async toggleAreaActive(id: string) {
    const area = await prisma.memberArea.findUnique({ where: { id } });
    if (!area) throw new Error('Area not found');
    return prisma.memberArea.update({
      where: { id },
      data: { isActive: !area.isActive },
    });
  },

  // ===== MEMBERS =====
  async getMembers(areaId: string, role?: MemberAreaRole) {
    const where: any = { areaId, isActive: true };
    if (role) where.role = role;

    const members = await prisma.memberAreaMember.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, phone: true, role: true, isVerified: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // Add referral stats for each member
    const membersWithStats = await Promise.all(members.map(async (member) => {
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: member.userId },
        select: { id: true, code: true },
      });

      if (!affiliate) {
        return { ...member, referralCount: 0, referralRevenue: 0 };
      }

      const [referralCount, referralRevenue] = await Promise.all([
        prisma.candidate.count({
          where: { referredBy: affiliate.code },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'VALID',
            candidate: { referredBy: affiliate.code },
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        ...member,
        referralCount,
        referralRevenue: Number(referralRevenue._sum.amount || 0),
        affiliateCode: affiliate.code,
      };
    }));

    return membersWithStats;
  },

  async getMember(areaId: string, userId: string) {
    return prisma.memberAreaMember.findUnique({
      where: { areaId_userId: { areaId, userId } },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  },

  async joinArea(areaId: string, userId: string, role?: MemberAreaRole) {
    const area = await prisma.memberArea.findUnique({ where: { id: areaId } });
    if (!area) throw new Error('Area not found');
    if (!area.isActive) throw new Error('Area is not active');

    if (area.visibility === MemberAreaVisibility.INVITE_ONLY) {
      throw new Error('This area is invite-only');
    }

    if (area.targetRole) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== area.targetRole) {
        throw new Error(`Only users with role ${area.targetRole} can join this area`);
      }
    }

    if (area.maxMembers) {
      const memberCount = await prisma.memberAreaMember.count({
        where: { areaId, isActive: true },
      });
      if (memberCount >= area.maxMembers) {
        throw new Error('Area is full');
      }
    }

    return prisma.memberAreaMember.upsert({
      where: { areaId_userId: { areaId, userId } },
      create: { areaId, userId, role: role || MemberAreaRole.MEMBER },
      update: { isActive: true, role: role || MemberAreaRole.MEMBER },
    });
  },

  async leaveArea(areaId: string, userId: string) {
    return prisma.memberAreaMember.update({
      where: { areaId_userId: { areaId, userId } },
      data: { isActive: false },
    });
  },

  async updateMemberRole(areaId: string, userId: string, role: MemberAreaRole) {
    return prisma.memberAreaMember.update({
      where: { areaId_userId: { areaId, userId } },
      data: { role },
    });
  },

  async inviteMember(areaId: string, userId: string, invitedBy: string) {
    return prisma.memberAreaMember.upsert({
      where: { areaId_userId: { areaId, userId } },
      create: { areaId, userId, invitedBy, role: MemberAreaRole.MEMBER },
      update: { isActive: true, invitedBy },
    });
  },

  async removeMember(areaId: string, userId: string) {
    return prisma.memberAreaMember.delete({
      where: { areaId_userId: { areaId, userId } },
    });
  },

  async getUserAreas(userId: string) {
    return prisma.memberAreaMember.findMany({
      where: { userId, isActive: true },
      include: {
        area: {
          include: {
            category: true,
            _count: { select: { members: true, posts: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  },

  // ===== POSTS =====
  async getPosts(areaId: string, options?: { page?: number; limit?: number; type?: PostType; search?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { areaId };
    if (options?.type) where.type = options.type;
    if (options?.search) {
      where.OR = [
        { title: { contains: options.search } },
        { content: { contains: options.search } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.memberAreaPost.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, role: true } },
          _count: { select: { comments: true, reactions: true } },
          reactions: {
            select: { emoji: true, userId: true },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.memberAreaPost.count({ where }),
    ]);

    return {
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getPostById(id: string) {
    return prisma.memberAreaPost.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        area: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, reactions: true } },
        reactions: {
          include: { user: { select: { id: true, email: true } } },
        },
        files: true,
      },
    });
  },

  async createPost(data: CreatePostInput) {
    return prisma.memberAreaPost.create({
      data: {
        areaId: data.areaId,
        userId: data.userId,
        title: data.title,
        content: data.content,
        type: data.type || PostType.DISCUSSION,
        tags: data.tags,
      },
    });
  },

  async updatePost(id: string, data: UpdatePostInput) {
    return prisma.memberAreaPost.update({ where: { id }, data });
  },

  async deletePost(id: string) {
    return prisma.memberAreaPost.delete({ where: { id } });
  },

  async togglePostPinned(id: string) {
    const post = await prisma.memberAreaPost.findUnique({ where: { id } });
    if (!post) throw new Error('Post not found');
    return prisma.memberAreaPost.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });
  },

  async togglePostLocked(id: string) {
    const post = await prisma.memberAreaPost.findUnique({ where: { id } });
    if (!post) throw new Error('Post not found');
    return prisma.memberAreaPost.update({
      where: { id },
      data: { isLocked: !post.isLocked },
    });
  },

  // ===== COMMENTS =====
  async getComments(postId: string, parentId?: string) {
    return prisma.memberAreaComment.findMany({
      where: { postId, parentId: parentId || null },
      include: {
        user: { select: { id: true, email: true, role: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getCommentById(id: string) {
    return prisma.memberAreaComment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        replies: {
          include: { user: { select: { id: true, email: true, role: true } } },
        },
      },
    });
  },

  async createComment(data: CreateCommentInput) {
    return prisma.memberAreaComment.create({
      data: {
        postId: data.postId,
        userId: data.userId,
        content: data.content,
        parentId: data.parentId,
      },
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    });
  },

  async updateComment(id: string, content: string) {
    return prisma.memberAreaComment.update({
      where: { id },
      data: { content },
    });
  },

  async deleteComment(id: string) {
    return prisma.memberAreaComment.delete({ where: { id } });
  },

  // ===== REACTIONS =====
  async addReaction(data: CreateReactionInput) {
    return prisma.memberAreaReaction.upsert({
      where: { postId_userId_emoji: { postId: data.postId, userId: data.userId, emoji: data.emoji } },
      create: data,
      update: {},
    });
  },

  async removeReaction(postId: string, userId: string, emoji: string) {
    return prisma.memberAreaReaction.delete({
      where: { postId_userId_emoji: { postId, userId, emoji } },
    });
  },

  async getPostReactions(postId: string) {
    const reactions = await prisma.memberAreaReaction.findMany({
      where: { postId },
      include: { user: { select: { id: true, email: true } } },
    });

    const grouped = reactions.reduce((acc: Record<string, { emoji: string; count: number; users: any[] }>, r: any) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user);
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: any[] }>);

    return Object.values(grouped);
  },

  // ===== FILES =====
  async getAreaFiles(areaId: string) {
    return prisma.memberAreaFile.findMany({
      where: { areaId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getPostFiles(postId: string) {
    return prisma.memberAreaFile.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createFile(data: { areaId?: string; postId?: string; userId: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }) {
    return prisma.memberAreaFile.create({ data });
  },

  async deleteFile(id: string) {
    return prisma.memberAreaFile.delete({ where: { id } });
  },

  // ===== STATS =====
  async getAreaStats(areaId: string) {
    const members = await prisma.memberAreaMember.findMany({
      where: { areaId, isActive: true },
      select: { userId: true },
    });

    const userIds = members.map(m => m.userId);

    const [memberCount, postCount, commentCount, fileCount, recentPosts, totalReferrals, totalReferralRevenue] = await Promise.all([
      prisma.memberAreaMember.count({ where: { areaId, isActive: true } }),
      prisma.memberAreaPost.count({ where: { areaId } }),
      prisma.memberAreaComment.count({ where: { post: { areaId } } }),
      prisma.memberAreaFile.count({ where: { areaId } }),
      prisma.memberAreaPost.findMany({
        where: { areaId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, email: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      prisma.candidate.count({
        where: {
          referredBy: {
            in: (await Promise.all(
              userIds.map(uid => prisma.affiliate.findUnique({ where: { userId: uid }, select: { code: true } }))
            )).filter(Boolean).map(a => a!.code),
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'VALID',
          candidate: {
            referredBy: {
              in: (await Promise.all(
                userIds.map(uid => prisma.affiliate.findUnique({ where: { userId: uid }, select: { code: true } }))
              )).filter(Boolean).map(a => a!.code),
            },
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      memberCount,
      postCount,
      commentCount,
      fileCount,
      recentPosts,
      totalReferrals,
      totalReferralRevenue: Number(totalReferralRevenue._sum.amount || 0),
    };
  },

  async getDashboardStats() {
    const [totalAreas, totalMembers, totalPosts, totalComments, areasByCategory, activeAreas] = await Promise.all([
      prisma.memberArea.count({ where: { isActive: true } }),
      prisma.memberAreaMember.count({ where: { isActive: true } }),
      prisma.memberAreaPost.count(),
      prisma.memberAreaComment.count(),
      prisma.memberAreaCategory.groupBy({
        by: ['name', 'id'],
        _count: { _all: true },
        where: { isActive: true },
      }),
      prisma.memberArea.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          category: true,
          _count: { select: { members: true, posts: true } },
        },
      }),
    ]);

    return {
      totalAreas,
      totalMembers,
      totalPosts,
      totalComments,
      areasByCategory,
      activeAreas,
    };
  },
};
