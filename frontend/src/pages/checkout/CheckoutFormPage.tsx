import { useState, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, CheckCircle, AlertCircle, ImageIcon, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

interface Field {
  key: string
  label: string
  required: boolean
  enabled: boolean
}

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
  const [ocrResult, setOcrResult] = useState<OcrData | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<any>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

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

  const selectedProgram = programs.find((p: Program) => p.id === selectedProgramId)
  const fields: Field[] = (setting?.fields || []).filter((f: Field) => f.enabled)
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

  const updateField = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }

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
    if (step === 2 && !selectedProgramId) {
      toast({ title: 'Pilih program terlebih dahulu', variant: 'destructive' })
      return
    }
    setStep(s => Math.min(s + 1, 4))
  }

  const handleSubmit = async () => {
    const requiredFields = fields.filter(f => f.required)
    for (const field of requiredFields) {
      if (!fieldValues[field.key]?.trim()) {
        toast({ title: `${field.label} harus diisi`, variant: 'destructive' })
        return
      }
    }

    if (!proofFile) {
      toast({ title: 'Dokumen Diperlukan', description: 'Silakan lampirkan bukti transfer terlebih dahulu.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('email', email)
      fd.append('password', password)
      fd.append('programId', selectedProgramId)
      if (refCode) fd.append('refCode', refCode)
      if (couponResult) fd.append('couponCode', couponResult.couponCode)
      fd.append('proof', proofFile)

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

  if (settingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!setting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Form Tidak Ditemukan</h1>
          <p className="text-sm text-muted-foreground mt-2">Form checkout tidak tersedia atau sudah tidak aktif</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Pendaftaran Berhasil!</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Data Anda telah berhasil dikirim. Silakan cek email untuk informasi lebih lanjut.
          </p>
          <Link to="/login">
            <Button>Masuk ke Akun</Button>
          </Link>
        </div>
      </div>
    )
  }

  const steps = [
    { id: 1, label: 'Akun' },
    { id: 2, label: 'Program' },
    { id: 3, label: 'Data Diri' },
    { id: 4, label: 'Konfirmasi' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-[500px]">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/logo2.png" alt="mendunia.id" className="h-9 w-auto mb-1 opacity-90" />
          <p className="text-sm text-muted-foreground mt-1">{setting.title}</p>
        </div>

        <div className="flex items-center justify-center gap-0 mb-6 px-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-primary text-primary-foreground ring-4 ring-primary/10' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <CheckCircle className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider hidden sm:block absolute mt-8 transition-colors ${step === s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-[1px] w-10 sm:w-16 mx-2 transition-colors ${step > s.id ? 'bg-emerald-500' : 'bg-border/60'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 w-full">
          {refCode && (
            <div className="mb-6 px-4 py-3 bg-primary/5 border border-primary/20 rounded-md text-xs text-primary/90 text-center">
              Kode Referral: <strong>{refCode}</strong>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alamat Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 8 karakter" className="h-10" />
              </div>
              <Button onClick={nextStep} className="w-full h-10">
                Lanjut <ChevronRight className="h-4 w-4 ml-1.5 opacity-70" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {programs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Tidak ada program tersedia</p>
              ) : (
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Program</Label>
                  {programs.map((p: Program) => (
                    <label key={p.id} className={`block p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedProgramId === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 hover:border-primary/40'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="program" checked={selectedProgramId === p.id} onChange={() => setSelectedProgramId(p.id)} className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.country || '-'}</p>
                        </div>
                        <p className="text-sm font-bold">{formatCurrency(Number(p.fee))}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="h-10">Kembali</Button>
                <Button onClick={nextStep} className="flex-1 h-10" disabled={!selectedProgramId}>
                  Lanjut <ChevronRight className="h-4 w-4 ml-1.5 opacity-70" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-3">
                {fields.map(field => {
                  if (field.key === 'gender') {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}>
                          <option value="">Pilih {field.label}</option>
                          <option value="LAKI_LAKI">Laki-laki</option>
                          <option value="PEREMPUAN">Perempuan</option>
                        </Select>
                      </div>
                    )
                  }
                  if (field.key === 'maritalStatus') {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}>
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
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)}>
                          <option value="">Pilih {field.label}</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="AB">AB</option>
                          <option value="O">O</option>
                        </Select>
                      </div>
                    )
                  }
                  if (field.key === 'birthDate') {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input type="date" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-10" />
                      </div>
                    )
                  }
                  if (['graduationYear', 'childOrder', 'totalSiblings'].includes(field.key)) {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input type="number" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-10" />
                      </div>
                    )
                  }
                  if (['height', 'weight'].includes(field.key)) {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input type="number" step="0.01" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-10" />
                      </div>
                    )
                  }
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Input value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className="h-10" />
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="h-10">Kembali</Button>
                <Button onClick={nextStep} className="flex-1 h-10">
                  Lanjut <ChevronRight className="h-4 w-4 ml-1.5 opacity-70" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              {programPrice !== null && (
                <div className="px-4 py-3 bg-muted/30 border border-border/60 rounded-md text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Program</span>
                    <span className="font-medium">{selectedProgram?.name || '-'}</span>
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
                        <span className="font-bold">{formatCurrency(couponResult.finalAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Biaya Program</span>
                      <span className="font-bold">{formatCurrency(programPrice)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kode Kupon</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan kode kupon"
                    className="h-10 flex-1"
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null) }}
                    disabled={!!couponResult}
                  />
                  {!couponResult ? (
                    <Button variant="outline" className="h-10" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pakai'}
                    </Button>
                  ) : (
                    <Button variant="outline" className="h-10 border-emerald-300 text-emerald-600" onClick={() => { setCouponCode(''); setCouponResult(null) }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {couponError && <p className="text-xs text-rose-500 font-medium">{couponError}</p>}
                {couponResult && <p className="text-xs text-emerald-600 font-medium">Kupon {couponResult.couponCode} berhasil!</p>}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upload Bukti Transfer</Label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} hidden />
                {!proofPreview ? (
                  <div onClick={() => fileRef.current?.click()} className="w-full h-36 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/10 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                    <p className="text-xs font-medium text-muted-foreground">Klik untuk upload bukti transfer</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, JPEG</p>
                  </div>
                ) : (
                  <div className="relative w-full rounded-lg overflow-hidden border border-border/60 bg-muted/10">
                    <img src={proofPreview} alt="Preview" className="w-full h-48 object-contain" />
                    <button type="button" onClick={removeFile} className="absolute top-2 right-2 h-7 w-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                    {ocrLoading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                )}

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

              <div className="px-4 py-3 bg-muted/30 border border-border/60 rounded-md text-xs space-y-1">
                <p className="font-semibold text-muted-foreground">Ringkasan Data</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{email}</span>
                </div>
                {fields.slice(0, 4).map(f => fieldValues[f.key] && (
                  <div key={f.key} className="flex justify-between">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium truncate max-w-[200px]">{fieldValues[f.key]}</span>
                  </div>
                ))}
                {fields.length > 4 && <p className="text-muted-foreground text-[10px]">...dan {fields.length - 4} field lainnya</p>}
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full h-10">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Mendaftarkan...</> : 'Daftar Sekarang'}
              </Button>

              <Button variant="ghost" onClick={() => setStep(3)} className="w-full h-10 text-sm text-muted-foreground">Kembali</Button>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground">
              Sudah memiliki akun?{' '}
              <Link to="/login" className="text-foreground font-medium hover:text-primary transition-colors">Masuk di sini</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
