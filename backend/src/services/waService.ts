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

async function apiPost(path: string, apiKey: string, body: any = {}, timeoutMs: number = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json() as any;
    return { ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function getSenderStatus(): Promise<{ connected: boolean; number: string | null }> {
  const config = await getWaConfig();
  if (!config.apiUrl || !config.apiKey) {
    return { connected: false, number: null };
  }
  return { connected: true, number: config.senderNumber || null };
}

export async function startSender(): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Cloud API selalu tersedia, tidak perlu start/stop' };
}

export async function stopSender(): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Cloud API selalu tersedia, tidak perlu start/stop' };
}

export async function sendWaMessage(to: string, message: string): Promise<boolean> {
  const config = await getWaConfig();
  if (!config.apiUrl || !config.apiKey) {
    logger.warn('WhatsApp not configured, skipping message to', to);
    return false;
  }
  try {
    await apiPost(`${config.apiUrl}/send`, config.apiKey, {
      messageType: 'text',
      to,
      body: message,
    });
    logger.info(`WhatsApp message sent to ${to}`);
    return true;
  } catch (error) {
    logger.error('Failed to send WhatsApp message:', error);
    return false;
  }
}

export async function sendWaOtp(to: string, otp: string): Promise<boolean> {
  const config = await getWaConfig();
  if (!config.apiUrl || !config.apiKey) {
    logger.warn('WhatsApp not configured, skipping OTP to', to);
    return false;
  }
  const message = `*Kode OTP Login Mendunia.ID*

Kode OTP Anda: *${otp}*

Kode berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.

Abaikan pesan ini jika Anda tidak merasa melakukan login.`;
  try {
    const { data } = await apiPost(`${config.apiUrl}/send`, config.apiKey, {
      messageType: 'text',
      to,
      body: message,
    });
    if (data?.success) {
      logger.info(`OTP sent successfully to ${to}`);
      return true;
    }
    logger.error('StarSender send failed:', data);
    return false;
  } catch (error) {
    logger.error('StarSender error:', error);
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
