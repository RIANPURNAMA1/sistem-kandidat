import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle, ImageIcon, ChevronLeft, ChevronRight, Mail, Lock, Banknote, Copy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
  phone: z.string().min(10, 'Nomor WhatsApp minimal 10 digit').regex(/^0\d{9,}$/, 'Format nomor tidak valid (mulai dengan 0)'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>
type OcrData = {
  senderName: string | null
  receiverName: string | null
  amount: number | null
  bankFrom: string | null
  bankTo: string | null
  referenceNumber: string | null
  transferDate: string | null
  confidence: number
  isValid: boolean
}

const steps = [
  { id: 1, label: 'Akun' },
  { id: 2, label: 'Pembayaran' },
  { id: 3, label: 'Selesai' },
]

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const programId = searchParams.get('programId')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrData | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [programName, setProgramName] = useState<string | null>(null)
  const [programPrice, setProgramPrice] = useState<number | null>(null)

  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponResult, setCouponResult] = useState<{
    couponCode: string
    discountType: string
    discountValue: number
    discountAmount: number
    originalAmount: number
    finalAmount: number
  } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  useEffect(() => {
    if (!programId) return
    api.get('/programs?limit=100').then(res => {
      const programs = res.data?.data || []
      const found = programs.find((p: any) => p.id === programId)
      if (found) {
        setProgramName(found.name)
        setProgramPrice(Number(found.fee))
      }
    }).catch(() => {})
  }, [programId])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    setCouponResult(null)

    try {
      const { data } = await api.post('/coupons/calculate', {
        code: couponCode.trim(),
        programId,
        amount: programPrice,
      })
      setCouponResult(data.data)
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || 'Kode kupon tidak valid')
      setCouponResult(null)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode('')
    setCouponResult(null)
    setCouponError(null)
  }

  useEffect(() => {
    if (!registered) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [registered])

  const { register, handleSubmit, trigger, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
    setOcrResult(null)
    setOcrLoading(true)

    try {
      const fd = new FormData()
      fd.append('proof', file)
      const { data } = await api.post('/ocr/analyze', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setOcrResult(data.data)
    } catch (err: any) {
      toast({
        title: 'Gagal Memproses',
        description: err?.response?.data?.message || 'Gagal memproses bukti pembayaran dengan sistem AI.',
        variant: 'destructive',
      })
    } finally {
      setOcrLoading(false)
    }
  }

  const removeFile = () => {
    setProofFile(null)
    setProofPreview(null)
    setOcrResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const nextStep = async () => {
    const fields: (keyof FormData)[] = step === 1 ? ['email', 'phone', 'password', 'confirmPassword'] : []
    const valid = await trigger(fields)
    if (valid) setStep(s => Math.min(s + 1, 3))
  }

  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const onSubmit = async () => {
    if (!proofFile) {
      toast({ title: 'Dokumen Diperlukan', description: 'Silakan lampirkan bukti transfer terlebih dahulu.', variant: 'destructive' })
      return
    }

    const data = getValues()
    try {
      const fd = new FormData()
      fd.append('email', data.email)
      fd.append('password', data.password)
      fd.append('phone', data.phone)
      fd.append('proof', proofFile)
      if (refCode) fd.append('refCode', refCode)
      if (programId) fd.append('programId', programId)
      if (couponResult) fd.append('couponCode', couponResult.couponCode)

      const res = await api.post('/auth/register-with-payment', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      localStorage.removeItem('auth-storage')
      setRegistered(true)
    } catch (err: any) {
      toast({
        title: 'Registrasi Gagal',
        description: err?.response?.data?.message || 'Terjadi kesalahan sistem saat mendaftar.',
        variant: 'destructive',
      })
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background selection:bg-primary/20 p-4 sm:p-8">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
              Pendaftaran Berhasil!
            </h1>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
              Selamat, akun Anda telah berhasil dibuat. Silakan masuk untuk mengakses dashboard.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Dialihkan ke halaman login dalam {countdown} detik...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background selection:bg-primary/20 p-4 sm:p-8">
      <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo2.png" alt="mendunia.id" className="h-9 w-auto mb-1 opacity-90" />
          <p className="text-sm text-muted-foreground mt-1.5">
            Lengkapi data dan lakukan pembayaran
          </p>
        </div>

        {/* Minimalist Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8 px-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                    step > s.id 
                      ? 'bg-emerald-500 text-white' 
                      : step === s.id 
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/10' 
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s.id ? <CheckCircle className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span 
                  className={`text-[10px] font-semibold uppercase tracking-wider hidden sm:block transition-colors absolute mt-8 ${
                    step === s.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div 
                  className={`h-[1px] w-12 sm:w-20 mx-2 transition-colors duration-300 ${
                    step > s.id ? 'bg-emerald-500' : 'bg-border/60'
                  }`} 
                />
              )}
            </div>
          ))}
        </div>

        {/* Content Wrapper */}
        <div className="mt-12 w-full">
          {refCode && (
            <div className="mb-6 px-4 py-3 bg-primary/5 border border-primary/20 rounded-md text-xs text-primary/90 text-center flex flex-col gap-0.5">
              <span>Referral aktif: <strong className="font-semibold">{refCode}</strong></span>
              {programId && <span className="opacity-80">Program: <strong>{programName || programId}</strong></span>}
            </div>
          )}

          {/* Step 1: Akun */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Alamat Email
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nama@perusahaan.com"
                  className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                  {...register('email')} 
                />
                {errors.email && <p className="text-xs text-rose-500 font-medium animate-in fade-in">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nomor WhatsApp
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08123456789"
                  className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                  {...register('phone')}
                />
                {errors.phone && <p className="text-xs text-rose-500 font-medium animate-in fade-in">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Password
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Minimal 8 karakter"
                  className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                  {...register('password')} 
                />
                {errors.password && <p className="text-xs text-rose-500 font-medium animate-in fade-in">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Konfirmasi Password
                </Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Ulangi password"
                  className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                  {...register('confirmPassword')} 
                />
                {errors.confirmPassword && <p className="text-xs text-rose-500 font-medium animate-in fade-in">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="button" onClick={nextStep} className="w-full h-10 rounded-md font-medium text-sm mt-2 transition-all active:scale-[0.99]">
                Lanjut <ChevronRight className="h-4 w-4 ml-1.5 opacity-70" />
              </Button>
            </div>
          )}

          {/* Step 2: Pembayaran */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

              {/* Info Harga Program */}
              {programPrice !== null && (
                <div className="px-4 py-3 bg-muted/30 border border-border/60 rounded-md text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Program</span>
                    <span className="font-medium">{programName || '-'}</span>
                  </div>
                  {couponResult ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Harga Normal</span>
                        <span className="text-muted-foreground line-through">{formatCurrency(programPrice)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Diskon {couponResult.discountType === 'PERCENTAGE' ? `${couponResult.discountValue}%` : formatCurrency(couponResult.discountValue)}</span>
                        <span>-{formatCurrency(couponResult.discountAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/40 pt-1 mt-1">
                        <span className="font-semibold">Total Dibayar</span>
                        <span className="font-bold text-foreground">{formatCurrency(couponResult.finalAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Biaya Program</span>
                      <span className="font-bold text-foreground">{formatCurrency(programPrice)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Kupon Diskon */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Kode Kupon Diskon
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan kode kupon"
                    className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors flex-1"
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null) }}
                    disabled={!!couponResult}
                  />
                  {!couponResult ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md px-4 border-border/60"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pakai'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md px-4 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                      onClick={handleRemoveCoupon}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {couponError && (
                  <p className="text-xs text-rose-500 font-medium animate-in fade-in">{couponError}</p>
                )}
                {couponResult && (
                  <p className="text-xs text-emerald-600 font-medium animate-in fade-in">
                    Kupon {couponResult.couponCode} berhasil diterapkan! Hemat {formatCurrency(couponResult.discountAmount)}
                  </p>
                )}
              </div>

              {/* Upload Bukti */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Upload Bukti Transfer
                </Label>
                <div className="relative">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} hidden />
                  
                  {!proofPreview ? (
                    <div 
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-36 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/10 flex flex-col items-center justify-center cursor-pointer transition-colors"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                      <p className="text-xs font-medium text-muted-foreground">Klik untuk upload bukti transfer</p>
                      <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, JPEG</p>
                    </div>
                  ) : (
                    <div className="relative w-full rounded-lg overflow-hidden border border-border/60 bg-muted/10">
                      <img src={proofPreview} alt="Preview" className="w-full h-48 object-contain" />
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute top-2 right-2 h-7 w-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {ocrLoading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {ocrResult && (
                  <div className={`p-3 rounded-lg border ${ocrResult.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {ocrResult.isValid ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-xs font-bold ${ocrResult.isValid ? 'text-emerald-700' : 'text-red-600'}`}>
                        {ocrResult.isValid ? 'Dokumen Valid' : 'Dokumen Tidak Valid'}
                      </span>
                    </div>
                    <div className="text-[10px] space-y-0.5">
                      <p className="text-muted-foreground">Tertangkap: {ocrResult.senderName} → {ocrResult.bankTo}</p>
                      <p className="text-muted-foreground">Nominal: <strong>{formatCurrency(ocrResult.amount ?? 0)}</strong></p>
                      {!ocrResult.isValid && ocrResult.confidence < 80 && (
                        <p className="text-red-500 font-medium mt-1">Confidence rendah ({ocrResult.confidence}%), upload ulang jika perlu</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Info pembayaran */}
              <div className="px-4 py-3 bg-muted/30 border border-border/60 rounded-md text-xs">
                <p className="text-muted-foreground">
                  Transfer sesuai nominal tagihan ke rekening yang tertera. 
                  Pastikan nama pengirim sesuai dengan nama pendaftar.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={prevStep} className="h-10 rounded-md px-4 border-border/60 text-muted-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={nextStep} className="flex-1 h-10 rounded-md font-medium text-sm transition-all active:scale-[0.99]">
                  Lanjut Konfirmasi <ChevronRight className="h-4 w-4 ml-1.5 opacity-70" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Selesai */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-muted/20 rounded-md border border-border/50 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 border-b border-border/40 pb-2">Ringkasan Pendaftaran</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Email Akun</span>
                    <span className="font-medium text-foreground">{getValues().email}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Program Tujuan</span>
                    <span className="font-medium text-foreground">{programName || programId || '-'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status Referral</span>
                    <span className="font-medium text-foreground">{refCode ? `Kode: ${refCode}` : 'Tidak ada'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status Berkas</span>
                    <span className="font-medium text-emerald-600">{ocrResult?.isValid ? 'Tervalidasi' : 'Butuh Verifikasi'}</span>
                  </div>
                  {couponResult && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Kupon Diskon</span>
                        <span className="font-medium text-emerald-600">{couponResult.couponCode} ({formatCurrency(couponResult.discountAmount)})</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold border-t border-border/40 pt-1 mt-1">
                        <span className="text-muted-foreground">Total Dibayar</span>
                        <span className="text-foreground">{formatCurrency(couponResult.finalAmount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={onSubmit} 
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-md font-medium text-sm transition-all active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Mendaftarkan...</>
                  ) : (
                    'Daftar Sekarang'
                  )}
                </Button>

                <Button type="button" variant="ghost" onClick={prevStep} className="w-full h-10 rounded-md text-sm text-muted-foreground hover:bg-muted/50">
                  <ChevronLeft className="h-4 w-4 mr-1.5 opacity-70" /> Kembali
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            Sudah memiliki akun?{' '}
            <Link to="/login" className="text-foreground font-medium hover:text-primary transition-colors">
              Masuk di sini
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}