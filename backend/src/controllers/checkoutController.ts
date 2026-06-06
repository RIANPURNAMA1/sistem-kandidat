import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { AppError, catchAsync, sendSuccess } from '../utils/AppError';
import { processPaymentProof } from '../services/ocrService';
import { uploadFile } from '../config/minio';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const DEFAULT_FIELDS = [
  { key: 'nik', label: 'NIK', required: true, enabled: true },
  { key: 'fullName', label: 'Nama Lengkap', required: true, enabled: true },
  { key: 'birthPlace', label: 'Tempat Lahir', required: true, enabled: true },
  { key: 'birthDate', label: 'Tanggal Lahir', required: true, enabled: true },
  { key: 'gender', label: 'Jenis Kelamin', required: true, enabled: true },
  { key: 'maritalStatus', label: 'Status Perkawinan', required: false, enabled: true },
  { key: 'address', label: 'Alamat', required: true, enabled: true },
  { key: 'kampung', label: 'Kampung', required: false, enabled: false },
  { key: 'desa', label: 'Desa', required: false, enabled: false },
  { key: 'kecamatan', label: 'Kecamatan', required: true, enabled: true },
  { key: 'kabupaten', label: 'Kabupaten', required: true, enabled: true },
  { key: 'provinsi', label: 'Provinsi', required: true, enabled: true },
  { key: 'lastEducation', label: 'Pendidikan Terakhir', required: true, enabled: true },
  { key: 'graduationYear', label: 'Tahun Lulus', required: false, enabled: false },
  { key: 'height', label: 'Tinggi Badan', required: false, enabled: false },
  { key: 'weight', label: 'Berat Badan', required: false, enabled: false },
  { key: 'bloodType', label: 'Golongan Darah', required: false, enabled: false },
  { key: 'clothingSize', label: 'Ukuran Baju', required: false, enabled: false },
  { key: 'phone', label: 'No. Telepon', required: true, enabled: true },
  { key: 'guardianName', label: 'Nama Wali', required: false, enabled: false },
  { key: 'guardianPhone', label: 'No. Telepon Wali', required: false, enabled: false },
  { key: 'fatherOccupation', label: 'Pekerjaan Ayah', required: false, enabled: false },
  { key: 'motherOccupation', label: 'Pekerjaan Ibu', required: false, enabled: false },
  { key: 'childOrder', label: 'Anak Ke-', required: false, enabled: false },
  { key: 'totalSiblings', label: 'Jumlah Saudara', required: false, enabled: false },
]

function generateSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

function mapCandidateFields(body: any) {
  const fields: Record<string, any> = {}

  if (body.nik !== undefined) fields.nik = body.nik
  if (body.fullName !== undefined) fields.fullName = body.fullName
  if (body.birthPlace !== undefined) fields.birthPlace = body.birthPlace
  if (body.birthDate !== undefined) fields.birthDate = new Date(body.birthDate)
  if (body.gender !== undefined) fields.gender = body.gender
  if (body.maritalStatus !== undefined) fields.maritalStatus = body.maritalStatus
  if (body.address !== undefined) fields.address = body.address
  if (body.kampung !== undefined) fields.kampung = body.kampung
  if (body.desa !== undefined) fields.desa = body.desa
  if (body.kecamatan !== undefined) fields.kecamatan = body.kecamatan
  if (body.kabupaten !== undefined) fields.kabupaten = body.kabupaten
  if (body.provinsi !== undefined) fields.provinsi = body.provinsi
  if (body.lastEducation !== undefined) fields.lastEducation = body.lastEducation
  if (body.graduationYear !== undefined) fields.graduationYear = body.graduationYear ? parseInt(body.graduationYear) : null
  if (body.height !== undefined) fields.height = body.height ? parseFloat(body.height) : null
  if (body.weight !== undefined) fields.weight = body.weight ? parseFloat(body.weight) : null
  if (body.bloodType !== undefined) fields.bloodType = body.bloodType
  if (body.clothingSize !== undefined) fields.clothingSize = body.clothingSize
  if (body.phone !== undefined) fields.phone = body.phone
  if (body.guardianName !== undefined) fields.guardianName = body.guardianName
  if (body.guardianPhone !== undefined) fields.guardianPhone = body.guardianPhone
  if (body.fatherOccupation !== undefined) fields.fatherOccupation = body.fatherOccupation
  if (body.motherOccupation !== undefined) fields.motherOccupation = body.motherOccupation
  if (body.childOrder !== undefined) fields.childOrder = body.childOrder ? parseInt(body.childOrder) : null
  if (body.totalSiblings !== undefined) fields.totalSiblings = body.totalSiblings ? parseInt(body.totalSiblings) : null

  return fields
}

export const getCheckoutSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await prisma.checkoutSetting.findMany({
    orderBy: { createdAt: 'desc' },
  })
  const parsed = settings.map(s => ({
    ...s,
    programIds: JSON.parse(s.programIds as string),
    fields: JSON.parse(s.fields as string),
  }))
  return sendSuccess(res, parsed)
})

export const getCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  const setting = await prisma.checkoutSetting.findUnique({
    where: { id: req.params.id as string },
  })
  if (!setting) throw new AppError('Pengaturan checkout tidak ditemukan', 404)
  return sendSuccess(res, {
    ...setting,
    programIds: JSON.parse(setting.programIds as string),
    fields: JSON.parse(setting.fields as string),
  })
})

export const createCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  const { title, programIds, template, fields } = req.body
  const slug = generateSlug(title)
  const setting = await prisma.checkoutSetting.create({
    data: {
      title,
      programIds: JSON.stringify(programIds || []),
      template: template || 'default',
      fields: JSON.stringify(fields || DEFAULT_FIELDS),
      slug,
    },
  })
  return sendSuccess(res, { ...setting, programIds: JSON.parse(setting.programIds as string), fields: JSON.parse(setting.fields as string) }, 'Pengaturan checkout berhasil dibuat', 201)
})

export const updateCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { title, programIds, template, fields, isActive } = req.body

  const existing = await prisma.checkoutSetting.findUnique({ where: { id } })
  if (!existing) throw new AppError('Pengaturan checkout tidak ditemukan', 404)

  const data: any = {}
  if (title !== undefined) data.title = title
  if (programIds !== undefined) data.programIds = JSON.stringify(programIds)
  if (template !== undefined) data.template = template
  if (fields !== undefined) data.fields = JSON.stringify(fields)
  if (isActive !== undefined) data.isActive = isActive

  const updated = await prisma.checkoutSetting.update({ where: { id }, data })
  return sendSuccess(res, { ...updated, programIds: JSON.parse(updated.programIds as string), fields: JSON.parse(updated.fields as string) }, 'Pengaturan checkout berhasil diperbarui')
})

export const deleteCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  await prisma.checkoutSetting.delete({ where: { id: req.params.id as string } })
  return sendSuccess(res, null, 'Pengaturan checkout berhasil dihapus')
})

export const getPublicCheckoutForm = catchAsync(async (req: Request, res: Response) => {
  const slug = req.params.slug as string
  const setting = await prisma.checkoutSetting.findUnique({ where: { slug, isActive: true } })
  if (!setting) throw new AppError('Form checkout tidak ditemukan atau tidak aktif', 404)
  return sendSuccess(res, {
    ...setting,
    programIds: JSON.parse(setting.programIds as string),
    fields: JSON.parse(setting.fields as string),
  })
})

export const submitCheckoutForm = catchAsync(async (req: Request, res: Response) => {
  const slug = req.params.slug as string
  const { email, password, programId, couponCode, refCode } = req.body

  const setting = await prisma.checkoutSetting.findUnique({ where: { slug, isActive: true } })
  if (!setting) throw new AppError('Form checkout tidak ditemukan atau tidak aktif', 404)

  const validProgramIds: string[] = JSON.parse(setting.programIds as string)
  if (validProgramIds.length > 0 && !validProgramIds.includes(programId)) {
    throw new AppError('Program tidak tersedia untuk form ini', 400)
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) throw new AppError('Email sudah terdaftar', 409)

  const hashed = await bcrypt.hash(password, 12)

  let fileUrl = ''
  let ocrResult = null
  if (req.file) {
    ocrResult = await processPaymentProof(req.file.buffer, req.file.mimetype)
    const objectName = `payments/${uuidv4()}-${req.file.originalname}`
    try {
      fileUrl = await uploadFile(objectName, req.file.buffer, req.file.mimetype)
    } catch (error) {
      logger.error('Storage upload error:', error)
      throw new AppError('Gagal mengunggah bukti pembayaran', 500)
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let validRefCode = null
    if (refCode) {
      const affiliate = await tx.affiliate.findUnique({ where: { code: refCode } })
      if (affiliate) {
        validRefCode = refCode
        await tx.affiliate.update({
          where: { code: refCode },
          data: { totalRegistrations: { increment: 1 } },
        })
      }
    }

    const user = await tx.user.create({
      data: { email, password: hashed, role: 'KANDIDAT' },
      select: { id: true, email: true, role: true, createdAt: true },
    })

    const candidateData: any = {
      userId: user.id,
      referredBy: validRefCode,
      ...mapCandidateFields(req.body),
    }

    if (!candidateData.nik) {
      candidateData.nik = `REG-${user.id.slice(0, 8).toUpperCase()}`
    }

    const candidate = await tx.candidate.create({ data: candidateData })

    let regProgram
    if (programId) {
      regProgram = await tx.program.findFirst({ where: { id: programId, status: 'AKTIF' } })
      if (!regProgram) throw new AppError('Program yang dipilih tidak tersedia', 400)
    } else {
      regProgram = await tx.program.findFirst({ where: { status: 'AKTIF' }, orderBy: { createdAt: 'asc' } })
      if (!regProgram) throw new AppError('Tidak ada program tersedia', 400)
    }

    let discountAmount = 0
    let finalAmount = Number(regProgram.fee)
    let validCouponCode = null
    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } })
      if (!coupon) throw new AppError('Kode kupon tidak valid', 400)
      if (!coupon.isActive) throw new AppError('Kupon sudah tidak aktif', 400)
      if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new AppError('Kupon sudah kadaluarsa', 400)
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) throw new AppError('Kuota kupon sudah habis', 400)
      if (coupon.programId && coupon.programId !== regProgram.id) throw new AppError('Kupon tidak berlaku untuk program ini', 400)
      if (Number(regProgram.fee) < Number(coupon.minPayment)) {
        throw new AppError(`Minimal pembayaran Rp ${Number(coupon.minPayment).toLocaleString('id-ID')} untuk kupon ini`, 400)
      }

      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (Number(regProgram.fee) * Number(coupon.discountValue)) / 100
        if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
          discountAmount = Number(coupon.maxDiscount)
        }
      } else {
        discountAmount = Number(coupon.discountValue)
      }

      finalAmount = Math.max(0, Number(regProgram.fee) - discountAmount)
      validCouponCode = coupon.code

      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      })
    }

    const application = await tx.application.create({
      data: {
        candidateId: candidate.id,
        programId: regProgram.id,
        status: fileUrl ? 'SUBMITTED' : 'DRAFT',
        statusHistory: {
          create: {
            status: fileUrl ? 'SUBMITTED' : 'DRAFT',
            notes: fileUrl ? 'Pendaftaran melalui form checkout dengan pembayaran' : 'Pendaftaran melalui form checkout',
          },
        },
      },
    })

    let payment = null
    if (fileUrl) {
      payment = await tx.payment.create({
        data: {
          applicationId: application.id,
          candidateId: candidate.id,
          amount: finalAmount,
          originalAmount: validCouponCode ? Number(regProgram.fee) : null,
          discountAmount: validCouponCode ? discountAmount : 0,
          couponCode: validCouponCode,
          status: 'MENUNGGU_VERIFIKASI',
          proofUrl: fileUrl,
          uploadedAt: new Date(),
          ocrData: ocrResult?.rawJson as any,
          ocrConfidence: ocrResult?.confidence,
          bankFrom: ocrResult?.bankFrom,
          bankTo: ocrResult?.bankTo,
          senderName: ocrResult?.senderName,
          receiverName: ocrResult?.receiverName,
          referenceNumber: ocrResult?.referenceNumber,
          transferDate: ocrResult?.transferDate ? new Date(ocrResult.transferDate) : null,
        },
      })
    }

    return { user, candidate, application, payment, regProgram }
  })

  return sendSuccess(res, {
    user: result.user,
    program: result.regProgram.name,
    applicationId: result.application.id,
    paymentId: result.payment?.id || null,
    paymentStatus: result.payment?.status || 'BELUM_BAYAR',
  }, 'Pendaftaran berhasil', 201)
})
