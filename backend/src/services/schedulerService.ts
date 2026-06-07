import * as cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

let scheduledTask: cron.ScheduledTask | null = null;

async function getSettings(): Promise<{ enabled: boolean; schedule: string }> {
  const keys = ['ocr_auto_verify_enabled', 'ocr_auto_verify_schedule'];
  const settings = await prisma.setting.findMany({
    where: { key: { in: keys } },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return {
    enabled: map.ocr_auto_verify_enabled === 'true',
    schedule: map.ocr_auto_verify_schedule || 'manual',
  };
}

async function getAdminUserId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return admin?.id || null;
}

async function runAutoVerify(): Promise<{ verified: number; skipped: number }> {
  try {
    const settings = await getSettings();
    if (!settings.enabled) {
      logger.info('[Scheduler] Auto-verify is disabled, skipping');
      return { verified: 0, skipped: 0 };
    }

    const adminId = await getAdminUserId();
    if (!adminId) {
      logger.warn('[Scheduler] No admin user found for auto-verify');
      return { verified: 0, skipped: 0 };
    }

    const { autoVerifyCore } = await import('../controllers/paymentController');
    const result = await autoVerifyCore(adminId);

    await prisma.setting.upsert({
      where: { key: 'ocr_auto_verify_last_run' },
      create: { key: 'ocr_auto_verify_last_run', value: new Date().toISOString(), group: 'OCR' },
      update: { value: new Date().toISOString() },
    });
    await prisma.setting.upsert({
      where: { key: 'ocr_auto_verify_last_result' },
      create: { key: 'ocr_auto_verify_last_result', value: JSON.stringify(result), group: 'OCR' },
      update: { value: JSON.stringify(result) },
    });

    logger.info(`[Scheduler] Auto-verify completed: ${result.verified} verified, ${result.skipped} skipped`);
    return result;
  } catch (err) {
    logger.error('[Scheduler] Auto-verify error:', err);
    return { verified: 0, skipped: 0 };
  }
}

export async function startScheduler(): Promise<void> {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  const settings = await getSettings();
  if (!settings.enabled || settings.schedule === 'manual') {
    logger.info('[Scheduler] Auto-verify scheduler not started (disabled or manual mode)');
    return;
  }

  if (!cron.validate(settings.schedule)) {
    logger.warn(`[Scheduler] Invalid cron expression: ${settings.schedule}`);
    return;
  }

  scheduledTask = cron.schedule(settings.schedule, async () => {
    logger.info('[Scheduler] Running scheduled auto-verify');
    await runAutoVerify();
  });

  logger.info(`[Scheduler] Auto-verify scheduler started with schedule: ${settings.schedule}`);
}

export async function stopScheduler(): Promise<void> {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('[Scheduler] Auto-verify scheduler stopped');
  }
}

export async function restartScheduler(): Promise<void> {
  await stopScheduler();
  await startScheduler();
}

export { runAutoVerify as runScheduledAutoVerify };
