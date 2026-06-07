import { Router } from 'express';
import {
  getSettings, updateSettings,
  getBanners, createBanner, updateBanner, deleteBanner,
  getTestimonials, createTestimonial, updateTestimonial,
  getFAQs, createFAQ, updateFAQ,
  getMyNotifications, markNotificationRead,
  getAuditLogs, getEmailSettings, updateEmailSettings, sendTestEmail,
  getWhatsAppSettings, updateWhatsAppSettings, getWaStatus, waStartSender, waStopSender, waSendTest,
  getPaymentSettings, updatePaymentSettings,
  getAffiliateSettings, updateAffiliateSettings,
  getOcrSettings, updateOcrSettings,
} from '../controllers/settingsController';
import { authenticate } from '../middlewares/auth';
import { isAdmin } from '../middlewares/authorize';

const router = Router();

// Public content
router.get('/banners', getBanners);
router.get('/testimonials', getTestimonials);
router.get('/faqs', getFAQs);

// Protected
router.use(authenticate);
router.get('/notifications', getMyNotifications);
router.put('/notifications/read', markNotificationRead);

// Admin only
router.get('/general', isAdmin, getSettings);
router.put('/general', isAdmin, updateSettings);
router.get('/audit-logs', isAdmin, getAuditLogs);
router.get('/email', isAdmin, getEmailSettings);
router.put('/email', isAdmin, updateEmailSettings);
router.post('/email/test', isAdmin, sendTestEmail);

router.post('/banners', isAdmin, createBanner);
router.put('/banners/:id', isAdmin, updateBanner);
router.delete('/banners/:id', isAdmin, deleteBanner);

router.post('/testimonials', isAdmin, createTestimonial);
router.put('/testimonials/:id', isAdmin, updateTestimonial);

router.post('/faqs', isAdmin, createFAQ);
router.put('/faqs/:id', isAdmin, updateFAQ);

// Payment / Rekening
router.get('/payment', isAdmin, getPaymentSettings);
router.put('/payment', isAdmin, updatePaymentSettings);

// Affiliate
router.get('/affiliate', isAdmin, getAffiliateSettings);
router.put('/affiliate', isAdmin, updateAffiliateSettings);

// WhatsApp
router.get('/whatsapp', isAdmin, getWhatsAppSettings);
router.put('/whatsapp', isAdmin, updateWhatsAppSettings);
router.get('/whatsapp/status', isAdmin, getWaStatus);
router.post('/whatsapp/start', isAdmin, waStartSender);
router.post('/whatsapp/stop', isAdmin, waStopSender);
router.post('/whatsapp/test', isAdmin, waSendTest);

// OCR / Auto-Verify
router.get('/ocr', isAdmin, getOcrSettings);
router.put('/ocr', isAdmin, updateOcrSettings);

export default router;
