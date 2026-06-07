import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { catchAsync, sendSuccess, sendPaginated } from '../utils/AppError';
import { AppError } from '../utils/AppError';

// ===================== COURSES =====================

export const getCourses = catchAsync(async (req: Request, res: Response) => {
  const { search, isActive, page, limit } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (search) where.title = { contains: search as string };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.course.count({ where }),
  ]);

  return sendPaginated(res, courses, total, pageNum, limitNum);
});

export const getAllCourses = catchAsync(async (_req: Request, res: Response) => {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    include: { _count: { select: { modules: true, enrollments: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, courses);
});

export const getCourseBySlug = catchAsync(async (req: Request, res: Response) => {
  const course = await prisma.course.findUnique({
    where: { slug: req.params.slug },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' }, include: { materials: true } },
          assignments: { include: { _count: { select: { submissions: true } } } },
          _count: { select: { lessons: true, assignments: true } },
        },
      },
      _count: { select: { modules: true, enrollments: true } },
    },
  });
  if (!course) throw new AppError('Course tidak ditemukan', 404);

  const enrollmentCount = await prisma.courseEnrollment.count({
    where: { courseId: course.id, status: 'AKTIF' },
  });

  return sendSuccess(res, { ...course, activeStudentCount: enrollmentCount });
});

export const getCourseById = catchAsync(async (req: Request, res: Response) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' }, include: { materials: true } },
          assignments: true,
          _count: { select: { lessons: true, assignments: true } },
        },
      },
      _count: { select: { modules: true, enrollments: true } },
    },
  });
  if (!course) throw new AppError('Course tidak ditemukan', 404);
  return sendSuccess(res, course);
});

export const createCourse = catchAsync(async (req: Request, res: Response) => {
  const { title, slug, description, coverUrl, isActive } = req.body;
  if (!title || !slug) throw new AppError('Title dan slug wajib diisi', 400);

  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) throw new AppError('Slug sudah digunakan', 400);

  const course = await prisma.course.create({
    data: { title, slug, description, coverUrl, isActive: isActive ?? true },
  });
  return sendSuccess(res, course, 'Course berhasil dibuat', 201);
});

export const updateCourse = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, slug, description, coverUrl, isActive } = req.body;

  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) throw new AppError('Course tidak ditemukan', 404);

  if (slug && slug !== existing.slug) {
    const slugExists = await prisma.course.findUnique({ where: { slug } });
    if (slugExists) throw new AppError('Slug sudah digunakan', 400);
  }

  const course = await prisma.course.update({
    where: { id },
    data: { title, slug, description, coverUrl, isActive },
  });
  return sendSuccess(res, course, 'Course berhasil diperbarui');
});

export const deleteCourse = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) throw new AppError('Course tidak ditemukan', 404);

  await prisma.course.delete({ where: { id } });
  return sendSuccess(res, null, 'Course berhasil dihapus');
});

export const toggleCourseActive = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new AppError('Course tidak ditemukan', 404);

  const updated = await prisma.course.update({
    where: { id },
    data: { isActive: !course.isActive },
  });
  return sendSuccess(res, updated, updated.isActive ? 'Course diaktifkan' : 'Course dinonaktifkan');
});

// ===================== MODULES =====================

export const getModules = catchAsync(async (req: Request, res: Response) => {
  const modules = await prisma.courseModule.findMany({
    where: { courseId: req.params.courseId },
    include: {
      lessons: { orderBy: { order: 'asc' } },
      assignments: true,
      _count: { select: { lessons: true, assignments: true } },
    },
    orderBy: { order: 'asc' },
  });
  return sendSuccess(res, modules);
});

export const createModule = catchAsync(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { title, description, order } = req.body;
  if (!title) throw new AppError('Title wajib diisi', 400);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError('Course tidak ditemukan', 404);

  const maxOrder = await prisma.courseModule.aggregate({
    where: { courseId },
    _max: { order: true },
  });

  const moduleData = await prisma.courseModule.create({
    data: {
      courseId,
      title,
      description,
      order: order ?? (maxOrder._max.order ?? 0) + 1,
    },
  });
  return sendSuccess(res, moduleData, 'Modul berhasil dibuat', 201);
});

export const updateModule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, order } = req.body;

  const existing = await prisma.courseModule.findUnique({ where: { id } });
  if (!existing) throw new AppError('Modul tidak ditemukan', 404);

  const moduleData = await prisma.courseModule.update({
    where: { id },
    data: { title, description, order },
  });
  return sendSuccess(res, moduleData, 'Modul berhasil diperbarui');
});

export const deleteModule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.courseModule.findUnique({ where: { id } });
  if (!existing) throw new AppError('Modul tidak ditemukan', 404);

  await prisma.courseModule.delete({ where: { id } });
  return sendSuccess(res, null, 'Modul berhasil dihapus');
});

// ===================== LESSONS =====================

export const getLessons = catchAsync(async (req: Request, res: Response) => {
  const lessons = await prisma.courseLesson.findMany({
    where: { moduleId: req.params.moduleId },
    include: { materials: true },
    orderBy: { order: 'asc' },
  });
  return sendSuccess(res, lessons);
});

export const getLessonById = catchAsync(async (req: Request, res: Response) => {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: req.params.id },
    include: { materials: true, module: { include: { course: true } } },
  });
  if (!lesson) throw new AppError('Lesson tidak ditemukan', 404);
  return sendSuccess(res, lesson);
});

export const createLesson = catchAsync(async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const { title, content, videoUrl, duration, order } = req.body;
  if (!title) throw new AppError('Title wajib diisi', 400);

  const moduleData = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!moduleData) throw new AppError('Modul tidak ditemukan', 404);

  const maxOrder = await prisma.courseLesson.aggregate({
    where: { moduleId },
    _max: { order: true },
  });

  const lesson = await prisma.courseLesson.create({
    data: {
      moduleId,
      title,
      content,
      videoUrl,
      duration: duration ? parseInt(duration) : null,
      order: order ?? (maxOrder._max.order ?? 0) + 1,
    },
  });
  return sendSuccess(res, lesson, 'Lesson berhasil dibuat', 201);
});

export const updateLesson = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, videoUrl, duration, order } = req.body;

  const existing = await prisma.courseLesson.findUnique({ where: { id } });
  if (!existing) throw new AppError('Lesson tidak ditemukan', 404);

  const lesson = await prisma.courseLesson.update({
    where: { id },
    data: {
      title,
      content,
      videoUrl,
      duration: duration !== undefined ? parseInt(duration) : undefined,
      order,
    },
  });
  return sendSuccess(res, lesson, 'Lesson berhasil diperbarui');
});

export const deleteLesson = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.courseLesson.findUnique({ where: { id } });
  if (!existing) throw new AppError('Lesson tidak ditemukan', 404);

  await prisma.courseLesson.delete({ where: { id } });
  return sendSuccess(res, null, 'Lesson berhasil dihapus');
});

// ===================== MATERIALS =====================

export const createMaterial = catchAsync(async (req: Request, res: Response) => {
  const { lessonId } = req.params;
  const { title, fileUrl, fileType, fileSize } = req.body;
  if (!title || !fileUrl) throw new AppError('Title dan fileUrl wajib diisi', 400);

  const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new AppError('Lesson tidak ditemukan', 404);

  const material = await prisma.courseMaterial.create({
    data: {
      lessonId,
      title,
      fileUrl,
      fileType: fileType || 'FILE',
      fileSize: fileSize ? parseInt(fileSize) : null,
    },
  });
  return sendSuccess(res, material, 'Material berhasil ditambahkan', 201);
});

export const deleteMaterial = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.courseMaterial.findUnique({ where: { id } });
  if (!existing) throw new AppError('Material tidak ditemukan', 404);

  await prisma.courseMaterial.delete({ where: { id } });
  return sendSuccess(res, null, 'Material berhasil dihapus');
});

// ===================== ASSIGNMENTS =====================

export const getAssignments = catchAsync(async (req: Request, res: Response) => {
  const assignments = await prisma.courseAssignment.findMany({
    where: { moduleId: req.params.moduleId },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, assignments);
});

export const getAssignmentById = catchAsync(async (req: Request, res: Response) => {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: req.params.id },
    include: {
      module: { include: { course: true } },
      submissions: {
        include: {
          enrollment: { include: { user: { select: { id: true, email: true } } } },
          grader: { select: { id: true, email: true } },
        },
        orderBy: { submittedAt: 'desc' },
      },
    },
  });
  if (!assignment) throw new AppError('Assignment tidak ditemukan', 404);
  return sendSuccess(res, assignment);
});

export const createAssignment = catchAsync(async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const { title, description, maxScore, dueDate } = req.body;
  if (!title) throw new AppError('Title wajib diisi', 400);

  const moduleData = await prisma.courseModule.findUnique({ where: { id: moduleId } });
  if (!moduleData) throw new AppError('Modul tidak ditemukan', 404);

  const assignment = await prisma.courseAssignment.create({
    data: {
      moduleId,
      title,
      description,
      maxScore: maxScore ? parseInt(maxScore) : 100,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  return sendSuccess(res, assignment, 'Tugas berhasil dibuat', 201);
});

export const updateAssignment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, maxScore, dueDate } = req.body;

  const existing = await prisma.courseAssignment.findUnique({ where: { id } });
  if (!existing) throw new AppError('Tugas tidak ditemukan', 404);

  const assignment = await prisma.courseAssignment.update({
    where: { id },
    data: {
      title,
      description,
      maxScore: maxScore ? parseInt(maxScore) : undefined,
      dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
    },
  });
  return sendSuccess(res, assignment, 'Tugas berhasil diperbarui');
});

export const deleteAssignment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.courseAssignment.findUnique({ where: { id } });
  if (!existing) throw new AppError('Tugas tidak ditemukan', 404);

  await prisma.courseAssignment.delete({ where: { id } });
  return sendSuccess(res, null, 'Tugas berhasil dihapus');
});

// ===================== ENROLLMENTS =====================

export const getEnrollments = catchAsync(async (req: Request, res: Response) => {
  const { courseId, status, page, limit } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (courseId) where.courseId = courseId;
  if (status) where.status = status;

  const [enrollments, total] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        user: { select: { id: true, email: true, role: true, candidate: { select: { fullName: true } } } },
        teacher: { select: { id: true, email: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { enrolledAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.courseEnrollment.count({ where }),
  ]);

  return sendPaginated(res, enrollments, total, pageNum, limitNum);
});

export const enrollStudent = catchAsync(async (req: Request, res: Response) => {
  const { courseId, userId } = req.body;
  if (!courseId || !userId) throw new AppError('courseId dan userId wajib diisi', 400);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError('Course tidak ditemukan', 404);

  const existing = await prisma.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
  });
  if (existing) throw new AppError('User sudah terdaftar di course ini', 400);

  const enrollment = await prisma.courseEnrollment.create({
    data: { courseId, userId },
  });
  return sendSuccess(res, enrollment, 'Berhasil mendaftar course', 201);
});

export const selfEnroll = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const { courseId } = req.body;
  if (!courseId) throw new AppError('courseId wajib diisi', 400);

  const course = await prisma.course.findUnique({ where: { id: courseId, isActive: true } });
  if (!course) throw new AppError('Course tidak ditemukan atau tidak aktif', 404);

  const existing = await prisma.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId: req.user.userId } },
  });
  if (existing) throw new AppError('Anda sudah terdaftar di course ini', 400);

  const enrollment = await prisma.courseEnrollment.create({
    data: { courseId, userId: req.user.userId },
  });
  return sendSuccess(res, enrollment, 'Berhasil mendaftar course', 201);
});

export const updateEnrollment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, teacherId } = req.body;

  const existing = await prisma.courseEnrollment.findUnique({ where: { id } });
  if (!existing) throw new AppError('Enrollment tidak ditemukan', 404);

  const data: any = {};
  if (status) data.status = status;
  if (teacherId !== undefined) data.teacherId = teacherId || null;
  if (status === 'SELESAI') data.completedAt = new Date();

  const enrollment = await prisma.courseEnrollment.update({
    where: { id },
    data,
  });
  return sendSuccess(res, enrollment, 'Enrollment berhasil diperbarui');
});

export const unenrollStudent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.courseEnrollment.findUnique({ where: { id } });
  if (!existing) throw new AppError('Enrollment tidak ditemukan', 404);

  await prisma.courseEnrollment.delete({ where: { id } });
  return sendSuccess(res, null, 'Student berhasil dihapus dari course');
});

export const getMyEnrollments = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId: req.user.userId },
    include: {
      course: {
        include: {
          _count: { select: { modules: true } },
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: { orderBy: { order: 'asc' } },
              assignments: {
                include: {
                  submissions: {
                    where: { enrollment: { userId: req.user.userId } },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  return sendSuccess(res, enrollments);
});

export const getMyCourseDetail = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId: req.params.courseId, userId: req.user.userId } },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                include: { materials: true },
              },
              assignments: {
                include: {
                  submissions: {
                    where: { enrollment: { userId: req.user.userId } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) throw new AppError('Anda belum terdaftar di course ini', 404);
  return sendSuccess(res, enrollment);
});

// ===================== SUBMISSIONS =====================

export const getSubmissions = catchAsync(async (req: Request, res: Response) => {
  const { assignmentId, page, limit } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;

  const where: any = {};
  if (assignmentId) where.assignmentId = assignmentId;

  const [submissions, total] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where,
      include: {
        assignment: { select: { id: true, title: true, maxScore: true } },
        enrollment: {
          include: {
            user: { select: { id: true, email: true, candidate: { select: { fullName: true } } } },
            course: { select: { id: true, title: true } },
          },
        },
        grader: { select: { id: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.assignmentSubmission.count({ where }),
  ]);

  return sendPaginated(res, submissions, total, pageNum, limitNum);
});

export const getMySubmissions = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { enrollment: { userId: req.user.userId } },
    include: {
      assignment: { select: { id: true, title: true, maxScore: true, dueDate: true } },
      enrollment: { include: { course: { select: { id: true, title: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });

  return sendSuccess(res, submissions);
});

export const submitAssignment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const { assignmentId } = req.params;
  const { content, fileUrl } = req.body;
  if (!content && !fileUrl) throw new AppError('Konten atau file harus diisi', 400);

  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) throw new AppError('Tugas tidak ditemukan', 404);

  const mod = await prisma.courseModule.findUnique({ where: { id: assignment.moduleId } });
  if (!mod) throw new AppError('Modul tidak ditemukan', 404);

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId: mod.courseId, userId: req.user.userId as string } },
  });
  if (!enrollment) throw new AppError('Anda tidak terdaftar di course ini', 400);

  const existing = await prisma.assignmentSubmission.findUnique({
    where: { assignmentId_enrollmentId: { assignmentId, enrollmentId: enrollment.id } },
  });
  if (existing && existing.status !== 'BELUM_MENGUMPULKAN') {
    throw new AppError('Anda sudah mengumpulkan tugas ini', 400);
  }

  const submission = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_enrollmentId: { assignmentId, enrollmentId: enrollment.id } },
    update: {
      content,
      fileUrl,
      status: 'MENUNGGU_DINILAI',
      submittedAt: new Date(),
    },
    create: {
      assignmentId,
      enrollmentId: enrollment.id,
      content,
      fileUrl,
      status: 'MENUNGGU_DINILAI',
      submittedAt: new Date(),
    },
  });

  return sendSuccess(res, submission, 'Tugas berhasil dikumpulkan', 201);
});

export const gradeSubmission = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const { id } = req.params;
  const { score, feedback } = req.body;
  if (score === undefined || score === null) throw new AppError('Score wajib diisi', 400);

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id },
  });
  if (!submission) throw new AppError('Submission tidak ditemukan', 404);

  const asg = await prisma.courseAssignment.findUnique({
    where: { id: submission.assignmentId },
  });
  if (!asg) throw new AppError('Assignment tidak ditemukan', 404);

  if (parseInt(score) > asg.maxScore) {
    throw new AppError(`Nilai maksimal adalah ${asg.maxScore}`, 400);
  }

  const graded = await prisma.assignmentSubmission.update({
    where: { id },
    data: {
      score: parseInt(score),
      feedback,
      status: 'DINILAI',
      gradedAt: new Date(),
      gradedBy: req.user.userId,
    },
  });

  return sendSuccess(res, graded, 'Nilai berhasil diberikan');
});

// ===================== GURU DASHBOARD =====================

export const getGuruDashboard = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Tidak terautentikasi', 401);

  const teachingEnrollments = await prisma.courseEnrollment.findMany({
    where: { teacherId: req.user.userId },
    include: {
      course: { select: { id: true, title: true } },
      user: { select: { id: true, email: true, candidate: { select: { fullName: true } } } },
    },
  });

  const myCourses = await prisma.courseEnrollment.findMany({
    where: { userId: req.user.userId },
    include: { course: true },
  });

  const pendingGrading = await prisma.assignmentSubmission.count({
    where: {
      status: 'MENUNGGU_DINILAI',
      enrollment: { teacherId: req.user.userId },
    },
  });

  return sendSuccess(res, {
    teachingEnrollments,
    myCourses,
    pendingGrading,
    totalStudents: teachingEnrollments.length,
  });
});

// ===================== STATS =====================

export const getLMSStats = catchAsync(async (_req: Request, res: Response) => {
  const [totalCourses, totalEnrollments, totalSubmissions, pendingGrading] = await Promise.all([
    prisma.course.count(),
    prisma.courseEnrollment.count(),
    prisma.assignmentSubmission.count(),
    prisma.assignmentSubmission.count({ where: { status: 'MENUNGGU_DINILAI' } }),
  ]);

  return sendSuccess(res, {
    totalCourses,
    totalEnrollments,
    totalSubmissions,
    pendingGrading,
  });
});
