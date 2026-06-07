import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Smartphone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/index'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/toaster'

const emailSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

const phoneSchema = z.object({
  phone: z.string().min(10, 'Nomor WhatsApp minimal 10 digit').regex(/^0\d{9,}$/, 'Format nomor tidak valid'),
})

const otpSchema = z.object({
  code: z.string().length(6, 'Kode OTP harus 6 digit').regex(/^\d{6}$/, 'Kode OTP hanya angka'),
})

type EmailFormData = z.infer<typeof emailSchema>
type PhoneFormData = z.infer<typeof phoneSchema>
type OtpFormData = z.infer<typeof otpSchema>

export default function LoginPage() {
  const [mode, setMode] = useState<'email' | 'whatsapp'>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const { login, sendOtp, verifyOtp, isLoading, isOtpLoading } = useAuthStore()

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  })

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  })

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  })

  const onEmailSubmit = async (data: EmailFormData) => {
    try {
      await login(data.email, data.password)
    } catch (err: any) {
      toast({
        title: 'Akses Ditolak',
        description: err?.response?.data?.message || 'Email atau password yang Anda masukkan salah.',
        variant: 'destructive',
      })
    }
  }

  const onPhoneSubmit = async (data: PhoneFormData) => {
    try {
      await sendOtp(data.phone)
      setPhoneNumber(data.phone)
      setOtpSent(true)
      toast({
        title: 'Kode OTP Terkirim',
        description: 'Silakan cek WhatsApp Anda untuk kode OTP.',
      })
    } catch (err: any) {
      toast({
        title: 'Gagal Mengirim OTP',
        description: err?.response?.data?.message || 'Nomor WhatsApp tidak terdaftar.',
        variant: 'destructive',
      })
    }
  }

  const onOtpSubmit = async (data: OtpFormData) => {
    try {
      await verifyOtp(phoneNumber, data.code)
    } catch (err: any) {
      toast({
        title: 'Kode OTP Salah',
        description: err?.response?.data?.message || 'Kode OTP tidak valid atau sudah kadaluarsa.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background selection:bg-primary/20 p-4">
      <div className="w-full max-w-[340px] animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header Section */}
        <div className="flex flex-col items-center text-start mb-8">
          <img
            src="/logo2.png"
            alt="mendunia.id"
            className="h-8 w-auto mb-1 opacity-90"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Selamat datang kembali di Mendunia
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-lg bg-muted/40 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'email'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode('whatsapp')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'whatsapp'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            WhatsApp
          </button>
        </div>

        {/* Email Login Form */}
        {mode === 'email' && (
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3"
                {...emailForm.register('email')}
              />
              {emailForm.formState.errors.email && (
                <p className="text-xs text-rose-500 font-medium animate-in fade-in">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Lupa password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3 font-mono"
                {...emailForm.register('password')}
              />
              {emailForm.formState.errors.password && (
                <p className="text-xs text-rose-500 font-medium animate-in fade-in">
                  {emailForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-md font-medium text-sm mt-4 shadow-none hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sedang memproses...</>
              ) : (
                'Lanjutkan'
              )}
            </Button>
          </form>
        )}

        {/* WhatsApp Login Form */}
        {mode === 'whatsapp' && !otpSent && (
          <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Nomor WhatsApp
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08123456789"
                className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3"
                {...phoneForm.register('phone')}
              />
              {phoneForm.formState.errors.phone && (
                <p className="text-xs text-rose-500 font-medium animate-in fade-in">
                  {phoneForm.formState.errors.phone.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Masukkan nomor WhatsApp yang terdaftar pada akun Anda
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-md font-medium text-sm mt-4 shadow-none hover:opacity-90 transition-opacity"
              disabled={isOtpLoading}
            >
              {isOtpLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim OTP...</>
              ) : (
                'Kirim Kode OTP'
              )}
            </Button>
          </form>
        )}

        {/* OTP Verification Form */}
        {mode === 'whatsapp' && otpSent && (
          <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium text-foreground">
                Kode OTP
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3 text-center text-lg tracking-[0.5em] font-mono"
                {...otpForm.register('code')}
              />
              {otpForm.formState.errors.code && (
                <p className="text-xs text-rose-500 font-medium animate-in fade-in">
                  {otpForm.formState.errors.code.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Kode OTP telah dikirim ke {phoneNumber}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-md font-medium text-sm mt-4 shadow-none hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...</>
              ) : (
                'Login'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false)
                  setPhoneNumber('')
                  otpForm.reset()
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Ganti nomor WhatsApp
              </button>
            </div>
          </form>
        )}

        {/* Register Link */}
        <div className="mt-6 space-y-2 text-center">
          <p className="text-xs text-muted-foreground">
            Belum punya akun?{' '}
            <a href="/register" className="text-foreground font-medium hover:text-primary transition-colors">
              Daftar di sini
            </a>
          </p>
          <p className="text-xs text-muted-foreground/70">
            Atau daftar sebagai{' '}
            <a href="/register/affiliate" className="text-[#009ce1] font-medium hover:text-[#007bc4] transition-colors">
              Affiliate Partner →
            </a>
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground/60 font-mono">
            Demo: admin@system.com / password123
          </p>
        </div>

      </div>
    </div>
  )
}
