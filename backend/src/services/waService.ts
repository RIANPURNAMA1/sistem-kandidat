import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface WaConfig {
  apiUrl: string;
  apiKey: string;
  senderNumber: string;
}

async function getWaConfig(): Promise<WaConfig> {
  const settings = await prisma.setting.findMany({
    where: { group: 'WHATSAPP' },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });

  return {
    apiUrl: map.wa_api_url || process.env.WA_API_URL || '',
    apiKey: map.wa_api_key || process.env.WA_API_KEY || '',
    senderNumber: map.wa_sender_number || '',
  };
}

async function apiGet(path: string, apiKey: string, timeoutMs: number = 5000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    return { ok: res.ok, data: await res.json() as any };
  } finally {
    clearTimeout(timer);
  }
}

async function apiPost(path: string, apiKey: string, body: any = {}, timeoutMs: number = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { ok: res.ok, data: await res.json() as any };
  } finally {
    clearTimeout(timer);
  }
}

export async function getSenderStatus(): Promise<{ connected: boolean; number: string | null }> {
  const config = await getWaConfig();
  if (!config.apiUrl || !config.apiKey) {
    return { connected: false, number: null };
  }
  try {
    const { data } = await apiGet(`${config.apiUrl}/status`, config.apiKey);
    return { connected: data?.connected || false, number: data?.number || null };
  } catch {
    return { connected: false, number: null };
  }
}

export async function startSender(): Promise<{ success: boolean; message: string }> {
  const config = await getWaConfig();
  if (!config.apiUrl || !config.apiKey) {
    return { success: false, message: 'API URL dan API Key WhatsApp belum dikonfigurasi' };
  }
  try {
    const { data } = await apiPost(`${config.apiUrl}/start`, config.apiKey);
    logger.info('WhatsApp sender started successfully');
    return { success: true, message: data?.message || 'Sender berhasil dijalankan' };
  } catch (error: any) {
    logger.error('Failed to start WhatsApp sender:', error?.message);
    return { success: false, message: error?.message || 'Gagal menjalankan sender' };
  }
}

export async function stopSender(): Promise<{ success: boolean; message: string }> {
  const config = await getWaConfig();
  if (!config.apiUrl || !config.apiKey) {
    return { success: false, message: 'API URL dan API Key WhatsApp belum dikonfigurasi' };
  }
  try {
    const { data } = await apiPost(`${config.apiUrl}/stop`, config.apiKey);
    logger.info('WhatsApp sender stopped successfully');
    return { success: true, message: data?.message || 'Sender berhasil dihentikan' };
  } catch (error: any) {
    logger.error('Failed to stop WhatsApp sender:', error?.message);
    return { success: false, message: error?.message || 'Gagal menghentikan sender' };
  }
}

export async function sendWaMessage(to: string, message: string): Promise<boolean> {
  const config = await getWaConfig();
  if (!config.apiUrl || !config.apiKey) {
    logger.warn('WhatsApp not configured, skipping message to', to);
    return false;
  }
  try {
    await apiPost(`${config.apiUrl}/send`, config.apiKey, {
      to,
      message,
      sender: config.senderNumber || undefined,
    });
    logger.info(`WhatsApp message sent to ${to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send WhatsApp message:', error);
    return false;
  }
}

export function paymentUploadedTemplate(candidateName: string, programName: string): string {
  return `Halo Admin,

Kandidat *${candidateName}* telah mengupload bukti pembayaran untuk program *${programName}*.

Silakan verifikasi pembayaran tersebut di panel admin.

Terima kasih.`;
}

export function paymentVerifiedTemplate(candidateName: string, programName: string): string {
  return `Halo *${candidateName}*,

Pembayaran Anda untuk program *${programName}* telah berhasil *DIVERIFIKASI* ✅

Status pendaftaran Anda kini: LUNAS.
Silakan lanjut ke tahap berikutnya melalui dashboard Anda.

Terima kasih.`;
}

export function paymentRejectedTemplate(candidateName: string, programName: string, reason: string): string {
  return `Halo *${candidateName}*,

Pembayaran Anda untuk program *${programName}* *DITOLAK* ❌

${reason ? `Alasan: ${reason}` : ''}

Silakan upload ulang bukti pembayaran yang benar melalui dashboard Anda.

Terima kasih.`;
}
