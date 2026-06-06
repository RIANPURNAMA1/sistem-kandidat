import nodemailer from 'nodemailer';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const settings = await prisma.setting.findMany({
    where: { group: 'EMAIL' },
  });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });

  return {
    host: map.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(map.smtp_port || process.env.SMTP_PORT || '587', 10),
    secure: (map.smtp_secure || process.env.SMTP_SECURE || 'false') === 'true',
    user: map.smtp_user || process.env.SMTP_USER || '',
    pass: map.smtp_pass || process.env.SMTP_PASS || '',
    from: map.smtp_from || process.env.SMTP_FROM || 'noreply@kerjanusantara.com',
  };
}

function getTransporter(config: SmtpConfig) {
  if (!config.user || !config.pass) return null;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    const transporter = getTransporter(config);

    if (!transporter) {
      logger.warn('SMTP not configured, skipping email to', to);
      return false;
    }

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });

    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Failed to send email:', error);
    return false;
  }
}

export function paymentUploadedTemplate(candidateName: string, programName: string, paymentAmount: string): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#4f46e5;padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;font-size:18px;margin:0">Bukti Pembayaran Diupload</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px">
        <p style="color:#374151;font-size:14px;line-height:1.6">Halo Admin,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Kandidat <strong>${candidateName}</strong> telah mengupload bukti pembayaran untuk program <strong>${programName}</strong> sebesar <strong>Rp ${paymentAmount}</strong>.
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6">Silakan verifikasi pembayaran tersebut di panel admin.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/payments" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;margin-top:8px">Lihat Pembayaran</a>
      </div>
    </div>
  `;
}

export function paymentVerifiedTemplate(candidateName: string, programName: string): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#059669;padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;font-size:18px;margin:0">Pembayaran Diverifikasi ✓</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px">
        <p style="color:#374151;font-size:14px;line-height:1.6">Halo <strong>${candidateName}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Pembayaran Anda untuk program <strong>${programName}</strong> telah berhasil <strong>diverifikasi</strong>.
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6">Status pendaftaran Anda kini: <strong>LUNAS</strong>.</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">Silakan lanjut ke tahap berikutnya melalui dashboard Anda.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/candidate/applications" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;margin-top:8px">Lihat Status</a>
      </div>
    </div>
  `;
}

export function paymentRejectedTemplate(candidateName: string, programName: string, reason: string): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#dc2626;padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;font-size:18px;margin:0">Pembayaran Ditolak ✗</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px">
        <p style="color:#374151;font-size:14px;line-height:1.6">Halo <strong>${candidateName}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Pembayaran Anda untuk program <strong>${programName}</strong> <strong>ditolak</strong>.
        </p>
        ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;margin:12px 0"><p style="color:#991b1b;font-size:13px;margin:0"><strong>Alasan:</strong> ${reason}</p></div>` : ''}
        <p style="color:#374151;font-size:14px;line-height:1.6">Silakan upload ulang bukti pembayaran yang benar.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/candidate/payments" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;margin-top:8px">Upload Ulang</a>
      </div>
    </div>
  `;
}
