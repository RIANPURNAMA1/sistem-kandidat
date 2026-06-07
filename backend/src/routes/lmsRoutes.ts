import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { isAdmin, isGuru, isKandidat } from '../middlewares/authorize';
import {
  getCourses, getCourseBySlug, getCourseById, createCourse, updateCourse, deleteCourse, toggleCourseActive, getAllCourses,
  getModules, createModule, updateModule, deleteModule,
  getLessons, getLessonById, createLesson, updateLesson, deleteLesson,
  createMaterial, deleteMaterial,
  getAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment,
  getEnrollments, enrollStudent, selfEnroll, updateEnrollment, unenrollStudent, getMyEnrollments, getMyCourseDetail,
  getSubmissions, getMySubmissions, submitAssignment, gradeSubmission,
  getGuruDashboard, getLMSStats,
} from '../controllers/lmsController';

const router = Router();

// ── Public / Authenticated ──
router.get('/courses', getCourses);
router.get('/courses/all', getAllCourses);
router.get('/courses/slug/:slug', getCourseBySlug);

// ── Authenticated only ──
router.get('/my-enrollments', authenticate, getMyEnrollments);
router.get('/my-enrollments/:courseId', authenticate, getMyCourseDetail);
router.get('/my-submissions', authenticate, getMySubmissions);
router.post('/enroll', authenticate, selfEnroll);
router.post('/assignments/:assignmentId/submit', authenticate, submitAssignment);

// ── Admin ──
router.get('/courses/:id', authenticate, isAdmin, getCourseById);
router.post('/courses', authenticate, isAdmin, createCourse);
router.put('/courses/:id', authenticate, isAdmin, updateCourse);
router.delete('/courses/:id', authenticate, isAdmin, deleteCourse);
router.patch('/courses/:id/toggle-active', authenticate, isAdmin, toggleCourseActive);

router.post('/courses/:courseId/modules', authenticate, isAdmin, createModule);
router.put('/modules/:id', authenticate, isAdmin, updateModule);
router.delete('/modules/:id', authenticate, isAdmin, deleteModule);

router.post('/modules/:moduleId/lessons', authenticate, isAdmin, createLesson);
router.put('/lessons/:id', authenticate, isAdmin, updateLesson);
router.delete('/lessons/:id', authenticate, isAdmin, deleteLesson);
router.get('/lessons/:id', authenticate, isAdmin, getLessonById);

router.post('/lessons/:lessonId/materials', authenticate, isAdmin, createMaterial);
router.delete('/materials/:id', authenticate, isAdmin, deleteMaterial);

router.post('/modules/:moduleId/assignments', authenticate, isAdmin, createAssignment);
router.put('/assignments/:id', authenticate, isAdmin, updateAssignment);
router.delete('/assignments/:id', authenticate, isAdmin, deleteAssignment);

// ── Admin & Guru ──
router.get('/enrollments', authenticate, isGuru, getEnrollments);
router.post('/enroll/student', authenticate, isGuru, enrollStudent);
router.put('/enrollments/:id', authenticate, isGuru, updateEnrollment);
router.delete('/enrollments/:id', authenticate, isGuru, unenrollStudent);

router.get('/assignments/:id', authenticate, isGuru, getAssignmentById);
router.get('/submissions', authenticate, isGuru, getSubmissions);
router.put('/submissions/:id/grade', authenticate, isGuru, gradeSubmission);

// ── Guru ──
router.get('/guru/dashboard', authenticate, isGuru, getGuruDashboard);

// ── Stats ──
router.get('/stats', authenticate, isAdmin, getLMSStats);

export default router;
