import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail, Lock, Banknote, ChevronDown, Check, User, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
  bankName: z.string().min(1, 'Nama bank harus diisi'),
  bankAccount: z.string().min(1, 'No. rekening harus diisi'),
  bankHolder: z.string().min(1, 'Nama pemilik harus diisi'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const steps = [
  { id: 1, label: 'Akun' },
  { id: 2, label: 'Program & Bank' },
  { id: 3, label: 'Selesai' },
]

export default function RegisterAffiliatePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [programs, setPrograms] = useState<any[]>([])
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [programsOpen, setProgramsOpen] = useState(false)

  useEffect(() => {
    api.get('/programs?limit=100').then(res => {
      setPrograms(res.data?.data || [])
    }).catch(() => {})
  }, [])

  const { register, handleSubmit, trigger, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const toggleProgram = (id: string) => {
    setSelectedProgramIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const nextStep = async () => {
    const fields: (keyof FormData)[] = step === 1 ? ['email', 'password', 'confirmPassword'] : []
    
    if (step === 2) {
      fields.push('bankName', 'bankAccount', 'bankHolder')
      if (selectedProgramIds.length === 0) {
        toast({ title: 'Program Kosong', description: 'Silakan pilih minimal 1 program afiliasi.', variant: 'destructive' })
        return
      }
    }

    const valid = await trigger(fields)
    if (valid) setStep(s => Math.min(s + 1, 3))
  }

  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const onSubmit = async () => {
    const data = getValues()
    try {
      const res = await api.post('/auth/register/affiliate', {
        email: data.email,
        password: data.password,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankHolder: data.bankHolder,
        programIds: selectedProgramIds,
      })
      useAuthStore.setState({
        user: res.data.data.user,
        token: res.data.data.token,
        isAuthenticated: true,
      })
      toast({ title: 'Registrasi Berhasil', description: 'Selamat bergabung sebagai Affiliate Mendunia.' })
      navigate('/affiliate')
    } catch (err: any) {
      toast({
        title: 'Registrasi Gagal',
        description: err?.response?.data?.message || 'Terjadi kesalahan sistem.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background selection:bg-primary/20 p-4 sm:p-8">
      <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo2.png" alt="mendunia.id" className="h-9 w-auto mb-1 opacity-90" />
          <p className="text-sm text-muted-foreground mt-1.5">
            Dapatkan komisi dari setiap referensi yang Anda bawa
          </p>
        </div>

        {/* Minimalist Stepper */}
        <div className="flex items-center justify-center gap-0 mb-10 px-2">
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
        <div className="w-full">
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

          {/* Step 2: Program & Bank */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Program Section */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Pilih Program <span className="text-[10px] lowercase text-muted-foreground font-normal">(Pilih 1 atau lebih)</span>
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProgramsOpen(!programsOpen)}
                    className="w-full h-10 rounded-md border border-border/60 bg-transparent px-3 text-sm text-left flex items-center justify-between hover:border-primary focus:border-primary transition-all"
                  >
                    <span className={selectedProgramIds.length > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                      {selectedProgramIds.length > 0
                        ? `${selectedProgramIds.length} program dipilih`
                        : 'Pilih program afiliasi...'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${programsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {programsOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-background border border-border/60 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {programs.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground text-center">Tidak ada program tersedia</p>
                      ) : (
                        programs.map((p: any) => {
                          const isSelected = selectedProgramIds.includes(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProgram(p.id)}
                              className={`w-full px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                                isSelected ? 'bg-primary/5 font-medium' : ''
                              }`}
                            >
                              <div className={`h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-primary border-primary' : 'border-border'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div className="flex-1 text-left flex items-center justify-between">
                                <span className="text-foreground">{p.name}</span>
                                {p.fee && <span className="text-[10px] px-2 py-0.5 bg-muted rounded font-mono text-muted-foreground">{formatCurrency(p.fee)}</span>}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                {selectedProgramIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {programs.filter(p => selectedProgramIds.includes(p.id)).map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-semibold rounded border border-primary/20">
                        {p.name}
                        <button type="button" onClick={() => toggleProgram(p.id)} className="hover:text-destructive transition-colors ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-[1px] w-full bg-border/40" />

              {/* Bank Section */}
              <div className="space-y-4">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rekening Penerimaan Komisi
                </Label>
                
                <div className="space-y-2">
                  <Input 
                    id="bankName" 
                    placeholder="Nama Bank (Cth: BCA, Mandiri)"
                    className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary transition-colors text-sm"
                    {...register('bankName')} 
                  />
                  {errors.bankName && <p className="text-xs text-rose-500 font-medium">{errors.bankName.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Input 
                    id="bankAccount" 
                    placeholder="Nomor Rekening"
                    className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary transition-colors text-sm font-mono"
                    {...register('bankAccount')} 
                  />
                  {errors.bankAccount && <p className="text-xs text-rose-500 font-medium">{errors.bankAccount.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Input 
                    id="bankHolder" 
                    placeholder="Nama Pemilik Rekening"
                    className="h-10 rounded-md bg-transparent border-border/60 focus-visible:border-primary transition-colors text-sm"
                    {...register('bankHolder')} 
                  />
                  {errors.bankHolder && <p className="text-xs text-rose-500 font-medium">{errors.bankHolder.message}</p>}
                </div>
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
                    <span className="text-muted-foreground">Bank Penerima</span>
                    <span className="font-medium text-foreground">{getValues().bankName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Program</span>
                    <span className="font-medium text-foreground">{selectedProgramIds.length} Program</span>
                  </div>
                </div>

                {selectedProgramIds.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-border/40 mt-3">
                    <span className="text-[10px] text-muted-foreground">Program Afiliasi:</span>
                    <div className="flex flex-wrap gap-1">
                      {programs.filter(p => selectedProgramIds.includes(p.id)).map(p => (
                        <span key={p.id} className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-semibold uppercase rounded border border-primary/20">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                    'Daftar Sebagai Affiliate'
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
            Sudah terdaftar sebagai Affiliate?{' '}
            <button type="button" className="text-foreground font-medium hover:text-primary transition-colors" onClick={() => navigate('/login')}>
              Masuk di sini
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}