import { logger } from '../utils/logger';

const STARSENDER_API_URL = 'https://api.starsender.online/api/send';

function getApiKey(): string {
  return process.env.STARSENDER_API_KEY || '';
}

export async function sendWaOtp(to: string, otp: string): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn('StarSender API key not configured');
    return false;
  }

  const message = `*Kode OTP Login Mendunia.ID*

Kode OTP Anda: *${otp}*

Kode berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.

Abaikan pesan ini jika Anda tidak merasa melakukan login.`;

  try {
    const res = await fetch(STARSENDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        messageType: 'text',
        to,
        body: message,
      }),
    });

    const data = await res.json() as { success: boolean; data?: any; message?: string };
    if (data.success) {
      logger.info(`OTP sent successfully to ${to}`);
      return true;
    } else {
      logger.error('StarSender send failed:', data);
      return false;
    }
  } catch (error) {
    logger.error('StarSender error:', error);
    return false;
  }
}
