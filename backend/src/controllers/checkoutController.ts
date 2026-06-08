import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { AppError, catchAsync, sendSuccess } from '../utils/AppError';
import { processPaymentProof } from '../services/ocrService';
import { uploadFile } from '../config/minio';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const DEFAULT_REGISTER_FIELDS = [
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
  { key: 'phone', label: 'No. WA', required: true, enabled: true },
  { key: 'guardianName', label: 'Nama Wali', required: false, enabled: false },
  { key: 'guardianPhone', label: 'No. WA Wali', required: false, enabled: false },
  { key: 'fatherOccupation', label: 'Pekerjaan Ayah', required: false, enabled: false },
  { key: 'motherOccupation', label: 'Pekerjaan Ibu', required: false, enabled: false },
  { key: 'childOrder', label: 'Anak Ke-', required: false, enabled: false },
  { key: 'totalSiblings', label: 'Jumlah Saudara', required: false, enabled: false },
]

const DEFAULT_AFFILIATE_FIELDS = [
  { key: 'fullName', label: 'Nama Lengkap', required: true, enabled: true },
  { key: 'nik', label: 'NIK', required: true, enabled: true },
  { key: 'phone', label: 'No. WA', required: true, enabled: true },
  { key: 'email', label: 'Email', required: true, enabled: true },
  { key: 'address', label: 'Alamat', required: true, enabled: true },
  { key: 'bankName', label: 'Nama Bank', required: true, enabled: true },
  { key: 'bankAccount', label: 'No. Rekening', required: true, enabled: true },
  { key: 'bankAccountName', label: 'Nama Pemilik Rekening', required: true, enabled: true },
  { key: 'instagram', label: 'Instagram', required: false, enabled: true },
  { key: 'tiktok', label: 'TikTok', required: false, enabled: true },
  { key: 'facebook', label: 'Facebook', required: false, enabled: true },
  { key: 'youtube', label: 'YouTube', required: false, enabled: true },
]

function generateSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

function mapCandidateFields(body: any) {
  const fields: Record<string, any> = {}
  const candidateFields = ['nik', 'fullName', 'birthPlace', 'birthDate', 'gender', 'maritalStatus', 'address', 'kampung', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'lastEducation', 'graduationYear', 'height', 'weight', 'bloodType', 'clothingSize', 'phone', 'guardianName', 'guardianPhone', 'fatherOccupation', 'motherOccupation', 'childOrder', 'totalSiblings']
  for (const field of candidateFields) {
    if (body[field] !== undefined) {
      if (['birthDate'].includes(field)) {
        fields[field] = new Date(body[field])
      } else if (['graduationYear', 'height', 'weight', 'childOrder', 'totalSiblings'].includes(field)) {
        fields[field] = body[field] ? parseFloat(body[field]) : null
      } else {
        fields[field] = body[field]
      }
    }
  }
  return fields
}

function mapAffiliateFields(body: any) {
  const fields: Record<string, any> = {}
  if (body.fullName) fields.fullName = body.fullName
  if (body.nik) fields.nik = body.nik
  if (body.phone) fields.phone = body.phone
  if (body.address) fields.address = body.address
  if (body.bankName) fields.bankName = body.bankName
  if (body.bankAccount) fields.bankAccount = body.bankAccount
  if (body.bankAccountName) fields.bankAccountName = body.bankAccountName
  if (body.instagram) fields.instagram = body.instagram
  if (body.tiktok) fields.tiktok = body.tiktok
  if (body.facebook) fields.facebook = body.facebook
  if (body.youtube) fields.youtube = body.youtube
  return fields
}

export const getCheckoutSettings = catchAsync(async (_req: Request, res: Response) => {
  const settings = await prisma.formSetting.findMany({
    orderBy: { createdAt: 'desc' },
  })
  const parsed = settings.map(s => ({
    ...s,
    programIds: s.programIds ? JSON.parse(s.programIds as string) : [],
    fields: JSON.parse(s.fields as string),
  }))
  return sendSuccess(res, parsed)
})

export const getCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  const setting = await prisma.formSetting.findUnique({
    where: { id: req.params.id as string },
  })
  if (!setting) throw new AppError('Pengaturan form tidak ditemukan', 404)
  return sendSuccess(res, {
    ...setting,
    programIds: setting.programIds ? JSON.parse(setting.programIds as string) : [],
    fields: JSON.parse(setting.fields as string),
  })
})

export const createCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  const { title, formType, programIds, template, fields, ocrEnabled } = req.body
  const slug = generateSlug(title)
  const resolvedFormType = formType || 'REGISTER'
  const resolvedFields = fields || (resolvedFormType === 'AFFILIATE' ? DEFAULT_AFFILIATE_FIELDS : DEFAULT_REGISTER_FIELDS)
  const setting = await prisma.formSetting.create({
    data: {
      title,
      formType: resolvedFormType,
      programIds: resolvedFormType === 'REGISTER' ? JSON.stringify(programIds || []) : undefined,
      template: template || 'default',
      fields: JSON.stringify(resolvedFields),
      ocrEnabled: ocrEnabled !== undefined ? ocrEnabled : true,
      slug,
    },
  })
  return sendSuccess(res, {
    ...setting,
    programIds: setting.programIds ? JSON.parse(setting.programIds as string) : [],
    fields: JSON.parse(setting.fields as string),
  }, 'Pengaturan form berhasil dibuat', 201)
})

export const updateCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { title, formType, programIds, template, fields, isActive, ocrEnabled } = req.body

  const existing = await prisma.formSetting.findUnique({ where: { id } })
  if (!existing) throw new AppError('Pengaturan form tidak ditemukan', 404)

  const data: any = {}
  if (title !== undefined) data.title = title
  if (formType !== undefined) data.formType = formType
  if (programIds !== undefined) data.programIds = JSON.stringify(programIds)
  if (template !== undefined) data.template = template
  if (fields !== undefined) data.fields = JSON.stringify(fields)
  if (isActive !== undefined) data.isActive = isActive
  if (ocrEnabled !== undefined) data.ocrEnabled = ocrEnabled

  const updated = await prisma.formSetting.update({ where: { id }, data })
  return sendSuccess(res, {
    ...updated,
    programIds: updated.programIds ? JSON.parse(updated.programIds as string) : [],
    fields: JSON.parse(updated.fields as string),
  }, 'Pengaturan form berhasil diperbarui')
})

export const deleteCheckoutSetting = catchAsync(async (req: Request, res: Response) => {
  await prisma.formSetting.delete({ where: { id: req.params.id as string } })
  return sendSuccess(res, null, 'Pengaturan form berhasil dihapus')
})

export const getPublicCheckoutForm = catchAsync(async (req: Request, res: Response) => {
  const slug = req.params.slug as string
  const setting = await prisma.formSetting.findUnique({ where: { slug, isActive: true } })
  if (!setting) throw new AppError('Form tidak ditemukan atau tidak aktif', 404)

  const programs = setting.formType === 'REGISTER' && setting.programIds
    ? await prisma.program.findMany({
        where: { id: { in: JSON.parse(setting.programIds as string) }, status: 'AKTIF' },
        select: { id: true, name: true, fee: true, country: true },
      })
    : []

  return sendSuccess(res, {
    ...setting,
    programIds: setting.programIds ? JSON.parse(setting.programIds as string) : [],
    fields: JSON.parse(setting.fields as string),
    programs,
  })
})

export const getActiveAffiliateForm = catchAsync(async (_req: Request, res: Response) => {
  const setting = await prisma.formSetting.findFirst({
    where: { formType: 'AFFILIATE', isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!setting) {
    return sendSuccess(res, null)
  }
  return sendSuccess(res, {
    ...setting,
    programIds: setting.programIds ? JSON.parse(setting.programIds as string) : [],
    fields: JSON.parse(setting.fields as string),
  })
})

export const submitCheckoutForm = catchAsync(async (req: Request, res: Response) => {
  const slug = req.params.slug as string
  const setting = await prisma.formSetting.findUnique({ where: { slug, isActive: true } })
  if (!setting) throw new AppError('Form tidak ditemukan atau tidak aktif', 404)

  const formType = setting.formType
  const fields: any[] = JSON.parse(setting.fields as string)

  if (formType === 'AFFILIATE') {
    return submitAffiliateForm(req, res, setting, fields)
  }

  return submitRegisterForm(req, res, setting, fields)
})

async function submitRegisterForm(req: Request, res: Response, setting: any, fields: any[]) {
  const { email, password, programId, couponCode, refCode } = req.body
  const phone = req.body.phone

  const enabledFields = fields.filter((f: any) => f.enabled)
  const requiredFields = enabledFields.filter((f: any) => f.required)
  for (const field of requiredFields) {
    if (req.body[field.key] === undefined || req.body[field.key] === null || req.body[field.key] === '') {
      throw new AppError(`Field ${field.label} wajib diisi`, 400)
    }
  }

  const validProgramIds: string[] = setting.programIds ? JSON.parse(setting.programIds as string) : []
  if (validProgramIds.length > 0 && !validProgramIds.includes(programId)) {
    throw new AppError('Program tidak tersedia untuk form ini', 400)
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) throw new AppError('Email sudah terdaftar', 409)

  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } })
    if (existingPhone) throw new AppError('Nomor WA sudah terdaftar', 409)
  }

  const hashed = await bcrypt.hash(password, 12)

  let fileUrl = ''
  let ocrResult = null
  const ocrEnabled = setting.ocrEnabled !== false
  const globalOcrSetting = await prisma.setting.findUnique({ where: { key: 'ocr_analysis_enabled' } })
  const ocrAnalysisEnabled = ocrEnabled && globalOcrSetting?.value !== 'false'
  if (req.file) {
    if (ocrAnalysisEnabled) {
      ocrResult = await processPaymentProof(req.file.buffer, req.file.mimetype)
    }
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
      data: { email, password: hashed, role: 'KANDIDAT', phone: phone || undefined },
      select: { id: true, email: true, role: true, phone: true, createdAt: true },
    })

    const mappedFields = mapCandidateFields(req.body)
    const candidateData: any = {
      userId: user.id,
      referredBy: validRefCode,
      fullName: mappedFields.fullName || '',
      birthPlace: mappedFields.birthPlace || '',
      birthDate: mappedFields.birthDate || new Date('2000-01-01'),
      gender: mappedFields.gender || 'LAKI_LAKI',
      maritalStatus: mappedFields.maritalStatus || 'BELUM_MENIKAH',
      address: mappedFields.address || '',
      kecamatan: mappedFields.kecamatan || '',
      kabupaten: mappedFields.kabupaten || '',
      provinsi: mappedFields.provinsi || '',
      lastEducation: mappedFields.lastEducation || '',
      phone: mappedFields.phone || '',
      ...mappedFields,
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
            notes: fileUrl ? 'Pendaftaran melalui form dengan pembayaran' : 'Pendaftaran melalui form',
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
}

async function submitAffiliateForm(req: Request, res: Response, setting: any, fields: any[]) {
  const { email, password, refCode } = req.body
  const phone = req.body.phone

  const enabledFields = fields.filter((f: any) => f.enabled)
  const requiredFields = enabledFields.filter((f: any) => f.required)
  for (const field of requiredFields) {
    if (req.body[field.key] === undefined || req.body[field.key] === null || req.body[field.key] === '') {
      throw new AppError(`Field ${field.label} wajib diisi`, 400)
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) throw new AppError('Email sudah terdaftar', 409)

  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } })
    if (existingPhone) throw new AppError('Nomor WA sudah terdaftar', 409)
  }

  const hashed = await bcrypt.hash(password, 12)
  const affiliateCode = `AFF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`

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
      data: { email, password: hashed, role: 'AFFILIATE', phone: phone || undefined },
      select: { id: true, email: true, role: true, phone: true, createdAt: true },
    })

    const affiliateData: any = {
      userId: user.id,
      code: affiliateCode,
      referredBy: validRefCode,
      ...mapAffiliateFields(req.body),
    }

    const affiliate = await tx.affiliate.create({ data: affiliateData })

    return { user, affiliate }
  })

  return sendSuccess(res, {
    user: result.user,
    affiliateCode: result.affiliate.code,
  }, 'Pendaftaran affiliate berhasil', 201)
}
