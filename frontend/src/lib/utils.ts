import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    AKTIF: 'bg-green-100 text-green-800',
    VALID: 'bg-green-100 text-green-800',
    APPROVED: 'bg-green-100 text-green-800',
    PAID: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    MENUNGGU_UPLOAD: 'bg-gray-100 text-gray-800',
    MENUNGGU_VERIFIKASI: 'bg-yellow-100 text-yellow-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    REVIEW: 'bg-purple-100 text-purple-800',
    INTERVIEW: 'bg-indigo-100 text-indigo-800',
    REJECTED: 'bg-red-100 text-red-800',
    DITOLAK: 'bg-red-100 text-red-800',
    NONAKTIF: 'bg-gray-100 text-gray-800',
    PENUH: 'bg-orange-100 text-orange-800',
    SELESAI: 'bg-gray-100 text-gray-800',
    TRAINING: 'bg-indigo-100 text-indigo-800',
    PLACED: 'bg-teal-100 text-teal-800',
    COMPLETED: 'bg-green-100 text-green-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    MENUNGGU_UPLOAD: 'Menunggu Upload',
    MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
    VALID: 'Valid',
    DITOLAK: 'Ditolak',
    SUBMITTED: 'Diajukan',
    REVIEW: 'Review',
    INTERVIEW: 'Interview',
    ACCEPTED: 'Diterima',
    REJECTED: 'Ditolak',
    WAITING_PAYMENT: 'Menunggu Pembayaran',
    PAID: 'Lunas',
    TRAINING: 'Pelatihan',
    PLACED: 'Ditempatkan',
    COMPLETED: 'Selesai',
    AKTIF: 'Aktif',
    NONAKTIF: 'Nonaktif',
    PENUH: 'Penuh',
    SELESAI: 'Selesai',
    APPROVED: 'Disetujui',
    PENDING: 'Menunggu',
  }
  return map[status] || status
}
