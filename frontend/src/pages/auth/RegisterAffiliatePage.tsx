import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'
import { Template, Field, templateStyles, BaseLayout } from '@/components/templates'

const DEFAULT_FIELDS: Field[] = [
  { key: 'fullName', label: 'Nama Lengkap', required: true, enabled: true },
  { key: 'nik', label: 'NIK', required: true, enabled: true },
  { key: 'phone', label: 'No. WA', required: true, enabled: true },
  { key: 'address', label: 'Alamat', required: true, enabled: true },
  { key: 'bankName', label: 'Nama Bank', required: true, enabled: true },
  { key: 'bankAccount', label: 'No. Rekening', required: true, enabled: true },
  { key: 'bankAccountName', label: 'Nama Pemilik Rekening', required: true, enabled: true },
  { key: 'instagram', label: 'Instagram', required: false, enabled: true },
  { key: 'tiktok', label: 'TikTok', required: false, enabled: true },
  { key: 'facebook', label: 'Facebook', required: false, enabled: true },
  { key: 'youtube', label: 'YouTube', required: false, enabled: true },
]

const steps = [
  { id: 1, label: 'Akun' },
  { id: 2, label: 'Data Diri' },
  { id: 3, label: 'Selesai' },
]

export default function RegisterAffiliatePage() {
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS)
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<Template>('default')
  const [title, setTitle] = useState('')

  useEffect(() => {
    api.get('/checkout/public/affiliate/active')
      .then(res => {
        const data = res.data?.data
        if (data?.fields?.length) {
          setFields(data.fields.filter((f: Field) => f.enabled))
        }
        if (data?.template) setTemplate(data.template as Template)
        if (data?.title) setTitle(data.title)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const s = templateStyles[template]

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
    setStep(s => Math.min(s + 1, 3))
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

    setSubmitting(true)
    try {
      await api.post('/auth/register/affiliate', {
        email,
        password,
        ...fieldValues,
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
    if (field.key === 'address') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className={s.labelClass}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            value={fieldValues[field.key] || ''}
            onChange={e => updateField(field.key, e.target.value)}
            className={`${s.inputClass.replace('h-11', '')} px-3`}
            rows={3}
          />
        </div>
      )
    }
    if (field.key === 'gender') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className={s.labelClass}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className={s.inputClass}>
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
          <Label className={s.labelClass}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className={s.inputClass}>
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
          <Label className={s.labelClass}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className={s.inputClass}>
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
          <Label className={s.labelClass}>
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
          <Label className={s.labelClass}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input type="date" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className={s.inputClass} />
        </div>
      )
    }
    if (field.key === 'phone') {
      return (
        <div key={field.key} className="space-y-2">
          <Label className={s.labelClass}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Input type="tel" placeholder="08123456789" value={fieldValues[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} className={s.inputClass} />
        </div>
      )
    }
    return (
      <div key={field.key} className="space-y-2">
        <Label className={s.labelClass}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          value={fieldValues[field.key] || ''}
          onChange={e => updateField(field.key, e.target.value)}
          className={s.inputClass}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const formContent = (
    <div className="space-y-5">
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

      {step === 2 && (
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

      {step === 3 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.slice(Math.ceil(fields.length / 2)).map(renderField)}
          </div>
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
          <Button variant="ghost" onClick={() => setStep(2)} className={`w-full h-11 rounded-md font-medium text-sm shadow-none ${s.buttonGhost}`}>Kembali</Button>
        </>
      )}
    </div>
  )

  return (
    <BaseLayout
      template={template}
      step={step}
      steps={steps}
      title={title}
      refCode={refCode}
      success={success}
    >
      {formContent}
    </BaseLayout>
  )
}
