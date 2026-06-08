import { useState, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle, AlertCircle, ChevronRight, ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'
import type { Template, Field } from '@/components/templates'
import { BaseLayout, templateStyles } from '@/components/templates'

interface Program {
  id: string
  name: string
  slug: string
  country: string
  fee: string | number
}

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
  rawJson?: { error?: string }
}

export default function CheckoutFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<any>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ocrResult, setOcrResult] = useState<OcrData | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)

  const { data: setting, isLoading: settingLoading } = useQuery({
    queryKey: ['checkout-public', slug],
    queryFn: async () => {
      const { data } = await api.get(`/checkout/public/${slug}`)
      return data.data
    },
    enabled: !!slug,
  })

  const programs: Program[] = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data } = await api.get('/programs?limit=200&status=AKTIF')
      return data.data || []
    },
    enabled: !!setting,
    select: (allPrograms) => {
      if (!setting?.programIds?.length) return allPrograms
      return allPrograms.filter((p: Program) => setting.programIds.includes(p.id))
    },
  }).data || []

  const isAffiliate = setting?.formType === 'AFFILIATE'
  const selectedProgram = programs.find((p: Program) => p.id === selectedProgramId)
  const fields: Field[] = (setting?.fields || []).filter((f: Field) => f.enabled)
  const template = (setting?.template as Template) || 'default'
  const ocrEnabled = setting?.ocrEnabled !== false
  const programPrice = selectedProgram ? Number(selectedProgram.fee) : null

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedProgramId) return
    setCouponLoading(true)
    setCouponError(null)
    setCouponResult(null)
    try {
      const { data } = await api.post('/coupons/calculate', {
        code: couponCode.trim(),
        programId: selectedProgramId,
        amount: programPrice,
      })
      setCouponResult(data.data)
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || 'Kode kupon tidak valid')
    } finally {
      setCouponLoading(false)
    }
  }

  const updateField = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
    setOcrResult(null)

    if (!ocrEnabled) return

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

  const hasFields = fields.length > 0
  const registerStepCount = hasFields ? 4 : 3
  const registerSteps = [
    { id: 1, label: 'Akun' },
    { id: 2, label: 'Program' },
    ...(hasFields ? [{ id: 3, label: 'Data Diri' }] : []),
    { id: registerStepCount, label: 'Konfirmasi' },
  ]

  const affiliateSteps = [
    { id: 1, label: 'Akun' },
    { id: 2, label: 'Data Diri' },
    { id: 3, label: 'Selesai' },
  ]

  const steps = isAffiliate ? affiliateSteps : registerSteps
  const totalSteps = steps.length

  const nextStep = () => {
    if (step === 1) {
      if (!email || !password) {
        toast({ title: 'Lengkapi data akun', variant: 'destructive' })
        return
      }
      if (password.length < 8) {
        toast({ title: 'Password minimal 8 karakter', variant: 'destructive' })
        return
      }
    }
    if (step === 2 && !isAffiliate && !selectedProgramId) {
      toast({ title: 'Pilih program terlebih dahulu', variant: 'destructive' })
      return
    }
    setStep(s => Math.min(s + 1, totalSteps))
  }

  const handleSubmit = async () => {
    const requiredFields = fields.filter(f => f.required)
    for (const field of requiredFields) {
      if (!fieldValues[field.key]?.trim()) {
        toast({ title: `${field.label} harus diisi`, variant: 'destructive' })
        return
      }
    }

    if (fieldValues.phone && !/^0\d{9,}$/.test(fieldValues.phone)) {
      toast({ title: 'Format No. WA tidak valid (mulai dengan 0, minimal 10 digit)', variant: 'destructive' })
      return
    }

    if (!isAffiliate && !proofFile) {
      toast({ title: 'Bukti transfer wajib diupload', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('email', email)
      fd.append('password', password)
      if (refCode) fd.append('refCode', refCode)

      if (!isAffiliate) {
        fd.append('programId', selectedProgramId)
        if (couponResult) fd.append('couponCode', couponResult.couponCode)
        if (proofFile) fd.append('proof', proofFile)
      }

      for (const [key, value] of Object.entries(fieldValues)) {
        if (value) fd.append(key, value)
      }

      await api.post(`/checkout/public/${slug}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSuccess(true)
    } catch (err: any) {
      toast({
        title: 'Pendaftaran Gagal',
        description: err?.response?.data?.message || 'Terjadi kesalahan sistem',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: Field) => {
    if (field.key === 'gender') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3">
            <option value="">Pilih {field.label}</option>
            <option value="LAKI_LAKI">Laki-laki</option>
            <option value="PEREMPUAN">Perempuan</option>
          </Select>
        </div>
      )
    }
    if (field.key === 'maritalStatus') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3">
            <option value="">Pilih {field.label}</option>
            <option value="BELUM_MENIKAH">Belum Menikah</option>
            <option value="MENIKAH">Menikah</option>
            <option value="CERAI">Cerai</option>
          </Select>
        </div>
      )
    }
    if (field.key === 'bloodType') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3">
            <option value="">Pilih {field.label}</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="AB">AB</option>
            <option value="O">O</option>
          </Select>
        </div>
      )
    }
    if (field.key === 'lastEducation') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className={s.inputClass}>
            <option value="">Pilih {field.label}</option>
            <option value="SD">SD / Sederajat</option>
            <option value="SMP">SMP / Sederajat</option>
            <option value="SMA">SMA / Sederajat</option>
            <option value="SMK">SMK / Sederajat</option>
            <option value="D1">D1 / D2</option>
            <option value="D3">D3</option>
            <option value="S1">S1 / D4</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
          </Select>
        </div>
      )
    }
    if (field.key === 'birthDate') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input type="date" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3" />
        </div>
      )
    }
    if (['graduationYear', 'childOrder', 'totalSiblings'].includes(field.key)) {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input type="number" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3" />
        </div>
      )
    }
    if (['height', 'weight'].includes(field.key)) {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input type="number" step="0.01" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3" />
        </div>
      )
    }
    if (field.key === 'address') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Textarea value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="text-sm rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all px-3" rows={3} />
        </div>
      )
    }
    if (field.key === 'phone') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input type="tel" placeholder="08123456789" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3" />
          <p className="text-[10px] text-muted-foreground">Gunakan nomor ini untuk login via WhatsApp nantinya</p>
        </div>
      )
    }
    return (
      <div key={field.key} className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        <Input value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3" />
      </div>
    )
  }

  if (settingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!setting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo2.png" alt="mendunia.id" className="h-8 w-auto mb-1 opacity-90" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Form Tidak Ditemukan</h1>
          <p className="text-sm text-muted-foreground mt-2">Form tidak tersedia atau sudah tidak aktif</p>
          <Link to="/login">
            <Button className="mt-6 w-full h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity">Kembali ke Login</Button>
          </Link>
        </div>
      </div>
    )
  }



  const s = templateStyles[template]

  return (
    <BaseLayout
      template={template}
      step={step}
      steps={steps}
      title={setting.title}
      refCode={refCode}
      success={success}
      successTitle={isAffiliate ? 'Pendaftaran Affiliate Berhasil!' : 'Pendaftaran Berhasil!'}
      successDesc={isAffiliate ? 'Akun affiliate Anda telah berhasil dibuat. Silakan cek email untuk informasi kode affiliate Anda.' : 'Data Anda telah berhasil dikirim. Silakan cek email untuk informasi lebih lanjut.'}
      successBtn="Masuk ke Akun"
      successLink="/login"
    >
      <div className="space-y-5">
        {/* Step 1: Account */}
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label className={s.labelClass}>Alamat Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" className={s.inputClass} />
            </div>
            <div className="space-y-2">
              <Label className={s.labelClass}>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 8 karakter" className={`${s.inputClass} font-mono`} />
            </div>
            <Button onClick={nextStep} className={`w-full h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity ${s.buttonPrimary}`}>
              Lanjut <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        )}

        {/* Step 2: Program Selection (Register) */}
        {step === 2 && !isAffiliate && (
          <>
            {programs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada program tersedia</p>
            ) : (
              <div className="space-y-2">
                <Label className={s.labelClass}>Pilih Program</Label>
                {programs.map((p: Program) => (
                  <label key={p.id} className={`block p-3 rounded-md border cursor-pointer transition-all ${
                    selectedProgramId === p.id ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-border'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="program" checked={selectedProgramId === p.id} onChange={() => setSelectedProgramId(p.id)} className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.country || '-'}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground">{formatCurrency(Number(p.fee))}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(1)} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none ${s.buttonOutline}`}>Kembali</Button>
              <Button onClick={nextStep} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity ${s.buttonPrimary}`} disabled={!selectedProgramId}>
                Lanjut <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Data Diri Part 1 (Affiliate) */}
        {step === 2 && isAffiliate && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.slice(0, Math.ceil(fields.length / 2)).map(renderField)}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(1)} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none ${s.buttonOutline}`}>Kembali</Button>
              <Button onClick={nextStep} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity ${s.buttonPrimary}`}>
                Lanjut <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Data Diri Part 2 (Affiliate) */}
        {step === 3 && isAffiliate && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.slice(Math.ceil(fields.length / 2)).map(renderField)}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(2)} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none ${s.buttonOutline}`}>Kembali</Button>
              <Button onClick={nextStep} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity ${s.buttonPrimary}`}>
                Lanjut <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Data Diri (Register) */}
        {step === 3 && !isAffiliate && hasFields && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(renderField)}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep(2)} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none ${s.buttonOutline}`}>Kembali</Button>
              <Button onClick={nextStep} className={`flex-1 h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity ${s.buttonPrimary}`}>
                Lanjut <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Confirmation + Payment (Register) */}
        {step === registerStepCount && !isAffiliate && (
          <>
            {/* Price Summary */}
            {programPrice !== null && (
              <div className="bg-muted/20 rounded-md border border-border/40 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Program</span>
                  <span className="font-medium text-foreground">{selectedProgram?.name || '-'}</span>
                </div>
                {couponResult ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground line-through">{formatCurrency(programPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Diskon</span>
                      <span>-{formatCurrency(couponResult.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/40 pt-1.5">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-bold text-foreground">{formatCurrency(couponResult.finalAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Biaya Program</span>
                    <span className="font-bold text-foreground">{formatCurrency(programPrice)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Coupon */}
            <div className="space-y-2">
              <Label className={s.labelClass}>Kode Kupon</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Masukkan kode kupon"
                  className={`${s.inputClass} flex-1`}
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null) }}
                  disabled={!!couponResult}
                />
                {!couponResult ? (
                  <Button variant="outline" className={`h-11 rounded-md font-medium text-sm shadow-none ${s.buttonOutline}`} onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pakai'}
                  </Button>
                ) : (
                  <Button variant="outline" className={`h-11 rounded-md font-medium text-sm shadow-none border-emerald-300 text-emerald-600 ${s.buttonOutline}`} onClick={() => { setCouponCode(''); setCouponResult(null) }}>
                    Hapus
                  </Button>
                )}
              </div>
              {couponError && <p className="text-xs text-rose-500 font-medium">{couponError}</p>}
              {couponResult && <p className="text-xs text-emerald-600 font-medium">Kupon berhasil digunakan!</p>}
            </div>

            {/* Payment Upload */}
            <div className="space-y-2">
              <Label className={s.labelClass}>Upload Bukti Transfer</Label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} hidden />
              {!proofPreview ? (
                <div onClick={() => fileRef.current?.click()} className="w-full h-32 rounded-md border-2 border-dashed border-border/40 hover:border-primary/40 bg-muted/10 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40 mb-1" />
                  <p className="text-xs text-muted-foreground">Klik untuk upload</p>
                </div>
              ) : (
                <div className="relative w-full rounded-md overflow-hidden border border-border/40 bg-muted/10">
                  <img src={proofPreview} alt="Preview" className="w-full h-32 object-contain" />
                  <button type="button" onClick={removeFile} className="absolute top-2 right-2 h-6 w-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
              )}
              {ocrResult && (
                <div className={`p-3 rounded-md border ${ocrResult.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
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
                    {ocrResult.senderName || ocrResult.bankTo ? (
                      <>
                        <p className="text-muted-foreground">Tertangkap: {ocrResult.senderName || '-'} → {ocrResult.bankTo || '-'}</p>
                        <p className="text-muted-foreground">Nominal: <strong>{formatCurrency(ocrResult.amount ?? 0)}</strong></p>
                      </>
                    ) : null}
                    {ocrResult.rawJson?.error && (
                      <p className="text-red-500 font-medium mt-1">{ocrResult.rawJson.error}</p>
                    )}
                    {!ocrResult.isValid && ocrResult.confidence < 80 && !ocrResult.rawJson?.error && (
                      <p className="text-red-500 font-medium mt-1">Confidence rendah ({ocrResult.confidence}%), upload ulang jika perlu</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className={`${s.summaryCardClass} p-3 space-y-1.5`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${s.summaryTitleClass}`}>Ringkasan Data</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">{email}</span>
              </div>
              {fields.slice(0, 3).map(f => fieldValues[f.key] && (
                <div key={f.key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-foreground truncate max-w-[200px]">{fieldValues[f.key]}</span>
                </div>
              ))}
              {fields.length > 3 && <p className="text-xs text-muted-foreground">...dan {fields.length - 3} field lainnya</p>}
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className={`w-full h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity ${s.buttonPrimary}`}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Mendaftarkan...</> : 'Daftar Sekarang'}
            </Button>

            <Button variant="ghost" onClick={() => setStep(registerStepCount - 1)} className={`w-full h-11 rounded-md font-medium text-sm text-muted-foreground shadow-none ${s.buttonGhost}`}>
              Kembali
            </Button>
          </>
        )}

        {/* Step 3: Confirmation (Affiliate) */}
        {step === 3 && isAffiliate && (
          <>
            {/* Summary */}
            <div className={`${s.summaryCardClass} p-3 space-y-1.5`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${s.summaryTitleClass}`}>Ringkasan Data</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">{email}</span>
              </div>
              {fields.slice(0, 3).map(f => fieldValues[f.key] && (
                <div key={f.key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-foreground truncate max-w-[200px]">{fieldValues[f.key]}</span>
                </div>
              ))}
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className={`w-full h-11 rounded-md font-medium text-sm shadow-none hover:opacity-90 transition-opacity ${s.buttonPrimary}`}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Mendaftarkan...</> : 'Daftar Affiliate'}
            </Button>

            <Button variant="ghost" onClick={() => setStep(2)} className={`w-full h-11 rounded-md font-medium text-sm text-muted-foreground shadow-none ${s.buttonGhost}`}>
              Kembali
            </Button>
          </>
        )}
      </div>
    </BaseLayout>
  )
}
