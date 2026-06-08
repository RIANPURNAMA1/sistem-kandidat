import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, ArrowLeft, Users, TrendingUp, Shield, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Template, Step } from './types'

interface BaseLayoutProps {
  children: ReactNode
  template: Template
  step: number
  steps: Step[]
  title: string
  refCode: string | null
  success: boolean
}

// ─── Shared Step Indicator ────────────────────────────────────────────────────

function StepIndicator({
  steps,
  step,
  template,
}: {
  steps: Step[]
  step: number
  template: Template
}) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((st, i) => (
        <div key={st.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              style={
                step === st.id
                  ? { background: '#009CE1', color: '#fff' }
                  : step > st.id
                  ? { background: '#10B981', color: '#fff' }
                  : template === 'modern'
                  ? { background: '#F0F9FF', border: '1.5px solid #BAE6FD', color: '#93C5FD' }
                  : { background: '#F8FAFC', border: '1.5px solid #E2E8F0', color: '#94A3B8' }
              }
              className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shadow-sm"
            >
              {step > st.id ? <CheckCircle className="h-4 w-4" /> : st.id}
            </div>
            <span
              style={
                step === st.id
                  ? { color: '#009CE1' }
                  : { color: '#94A3B8' }
              }
              className="text-[10px] font-semibold hidden sm:block tracking-wide"
            >
              {st.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={step > st.id ? { background: '#10B981' } : { background: '#E2E8F0' }}
              className="h-[1.5px] w-8 sm:w-12 mx-1 transition-colors duration-300"
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Success View ─────────────────────────────────────────────────────────────

function SuccessView() {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col items-center mb-8">
        <img src="/logo2.png" alt="mendunia.id" className="h-7 w-auto mb-1 opacity-80" />
      </div>
      <div
        className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ background: '#F0FDF4' }}
      >
        <CheckCircle className="h-8 w-8 text-emerald-500" />
      </div>
      <h1 className="text-[22px] font-bold mb-2 text-slate-800">Pendaftaran Berhasil!</h1>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Akun affiliate Anda telah berhasil dibuat.
        <br />
        Silakan cek email untuk informasi kode affiliate Anda.
      </p>
      <Link to="/login">
        <Button
          className="w-full h-11 rounded-lg font-semibold text-sm shadow-none text-white transition-opacity hover:opacity-90"
          style={{ background: '#009CE1' }}
        >
          Masuk ke Akun
        </Button>
      </Link>
    </div>
  )
}

// ─── Modern Template ──────────────────────────────────────────────────────────

function ModernLayout({
  children,
  step,
  steps,
  title,
  refCode,
  success,
}: Omit<BaseLayoutProps, 'template'>) {
  const testimonial = {
    quote: 'Platform affiliate terbaik yang pernah saya gunakan. Komisi cair tepat waktu dan support sangat responsif.',
    name: 'Rina Kusuma',
    role: 'Partner sejak 2024',
    rating: 5,
  }

  const perks = [
    { icon: TrendingUp, label: 'Komisi Kompetitif', value: 'Hingga 10% per referral' },
    { icon: Shield, label: 'Keamanan Terjamin', value: 'Data terenkripsi & aman' },
    { icon: Users, label: 'Komunitas Aktif', value: '2,500+ affiliate partner' },
  ]

  const wrapSuccess = (content: ReactNode) => (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F0F9FF' }}>
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        {content}
      </div>
    </div>
  )

  if (success) return wrapSuccess(<SuccessView />)

  return (
    <div className="min-h-screen flex" style={{ background: '#F0F9FF' }}>
      {/* ── Left Sidebar ── */}
      <div
        className="hidden lg:flex lg:w-[380px] xl:w-[420px] flex-col justify-between p-10 relative overflow-hidden flex-shrink-0"
        style={{ background: '#009CE1' }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-10"
          style={{ background: '#fff' }}
        />
        <div
          className="absolute bottom-16 -left-12 h-48 w-48 rounded-full opacity-10"
          style={{ background: '#fff' }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-12">
            <img src="/logo2.png" alt="mendunia.id" className="h-8 w-auto brightness-0 invert opacity-90" />
          </div>

          {/* Headline */}
          <div className="mb-10">
            <h2 className="text-[28px] xl:text-[32px] font-bold text-white leading-tight mb-4">
              Daftar Affiliate
              <br />
              Partner Kami
            </h2>
            <p className="text-[13px] text-white/75 leading-relaxed max-w-[260px]">
              Bergabunglah dengan ribuan affiliate dan raih penghasilan tambahan dari setiap referral Anda.
            </p>
          </div>

          {/* Perks */}
          <div className="space-y-4">
            {perks.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-white">{label}</p>
                  <p className="text-[11px] text-white/65">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial card */}
        <div className="relative z-10 bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
            ))}
          </div>
          <p className="text-[12px] text-white/90 leading-relaxed mb-4 italic">
            &ldquo;{testimonial.quote}&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-white/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {testimonial.name.split(' ').map((n) => n[0]).join('')}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-white">{testimonial.name}</p>
              <p className="text-[10px] text-white/60">{testimonial.role}</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-white/40">&copy; 2026 mendunia.id</p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-10">
        <div className="w-full max-w-[480px]">
          {/* Card */}
          <div className=" rounded-sm shadow-sm border border-slate-100 p-8 lg:p-10">
            {/* Mobile header */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <Link to="/login" className="text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <span className="text-sm font-bold text-slate-800">mendunia.id</span>
            </div>

            {/* Desktop back link */}
            <div className="hidden lg:flex mb-6">
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke Login
              </Link>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h3 className="text-[22px] font-bold text-slate-800 leading-tight">
                {title || "Let's get started"}
              </h3>
              <p className="text-[13px] text-slate-500 mt-1">
                Isi data di bawah untuk membuat akun affiliate Anda
              </p>
            </div>

            {/* Referral badge */}
            {refCode && (
              <div
                className="mb-5 px-4 py-2.5 rounded-xl text-[12px] text-center font-medium"
                style={{ background: '#F0F9FF', color: '#009CE1', border: '1px solid #BAE6FD' }}
              >
                Kode Referral aktif:{' '}
                <strong className="font-bold">{refCode}</strong>
              </div>
            )}

            {/* Step indicator */}
            <StepIndicator steps={steps} step={step} template="modern" />

            {/* Form slot */}
            {children}
          </div>

          {/* Footer */}
          <p className="text-[12px] text-slate-400 text-center mt-5">
            Sudah memiliki akun?{' '}
            <Link
              to="/login"
              className="font-semibold hover:underline transition-colors"
              style={{ color: '#009CE1' }}
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Classic Template ─────────────────────────────────────────────────────────

function ClassicLayout({
  children,
  step,
  steps,
  title,
  refCode,
  success,
}: Omit<BaseLayoutProps, 'template'>) {
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-[420px]  rounded-2xl shadow-lg border border-slate-200 p-8">
          <SuccessView />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-[440px]">
        {/* Card */}
        <div className=" rounded-sm  border border-slate-200 overflow-hidden">
          {/* Header bar */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: '#009CE1' }}
          >
            <div className="flex items-center gap-2.5">
              <img
                src="/logo2.png"
                alt="mendunia.id"
                className="h-5 w-auto brightness-0 invert opacity-90"
              />
              <span className="text-sm font-bold text-white tracking-wide">mendunia.id</span>
            </div>
            <Link to="/login" className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {/* Body */}
          <div className="px-7 py-7">
            {/* Title section */}
            <div className="mb-6">
              <h2 className="text-[18px] font-bold text-slate-800">
                {title || 'Daftar Affiliate Partner'}
              </h2>
              <div className="mt-2 h-[3px] w-10 rounded-full" style={{ background: '#009CE1' }} />
              <p className="text-[12px] text-slate-500 mt-2">
                Lengkapi data berikut untuk mendaftar sebagai affiliate
              </p>
            </div>

            {/* Referral badge */}
            {refCode && (
              <div
                className="mb-5 px-4 py-2.5 rounded-lg text-[12px] text-center font-medium"
                style={{ background: '#F0F9FF', color: '#007AB5', border: '1px solid #BAE6FD' }}
              >
                Kode Referral: <strong>{refCode}</strong>
              </div>
            )}

            {/* Step indicator */}
            <StepIndicator steps={steps} step={step} template="classic" />

            {/* Form slot */}
            {children}
          </div>

          {/* Footer */}
          <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[12px] text-slate-400">
              Sudah memiliki akun?{' '}
              <Link
                to="/login"
                className="font-semibold hover:underline"
                style={{ color: '#009CE1' }}
              >
                Masuk
              </Link>
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-4">
          &copy; 2026 mendunia.id — Hak cipta dilindungi
        </p>
      </div>
    </div>
  )
}

// ─── Minimal / Default Template ───────────────────────────────────────────────

function MinimalLayout({
  children,
  step,
  steps,
  title,
  refCode,
  success,
  template: tpl,
}: BaseLayoutProps) {
  const isMinimal = tpl === 'minimal'

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isMinimal ? 'bg-white' : 'bg-background'}`}>
        <div className="w-full max-w-[420px]">
          <SuccessView />
        </div>
      </div>
    )
  }

  if (isMinimal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white selection:bg-gray-50 p-4">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 text-center">
            <div className="mb-8">
              <img src="/logo2.png" alt="mendunia.id" className="h-6 w-auto mx-auto opacity-80" />
            </div>
            <h1 className="text-[26px] font-light text-gray-900 tracking-tight mb-1.5">
              {title || 'Daftar Affiliate'}
            </h1>
            <p className="text-[13px] text-gray-400 font-light">Isi data di bawah untuk mendaftar</p>
          </div>

          {refCode && (
            <div className="mb-6 px-4 py-3 bg-gray-50 border border-gray-100 text-xs text-gray-500 text-center font-medium tracking-wide uppercase">
               Kode Referral: <strong className="text-gray-800">{refCode}</strong>
            </div>
          )}

          <StepIndicator steps={steps} step={step} template="minimal" />

          {children}

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400 font-light">
              Sudah memiliki akun?{' '}
              <Link to="/login" className="text-gray-900 font-medium hover:underline">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background selection:bg-primary/20 p-4">
      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center mb-6">
          <Link to="/login">
            <img src="/logo2.png" alt="mendunia.id" className="h-8 w-auto mb-1 opacity-90" />
          </Link>
          <p className="text-sm text-muted-foreground mt-2">{title || 'Daftar Affiliate Partner'}</p>
        </div>

        {refCode && (
          <div className="mb-5 px-3 py-2 bg-primary/5 border border-primary/20 text-primary rounded-md text-xs text-center font-medium">
            Kode Referral: <strong>{refCode}</strong>
          </div>
        )}

        <StepIndicator steps={steps} step={step} template="minimal" />

        {children}

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Sudah memiliki akun?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Root Export ──────────────────────────────────────────────────────────────

export default function BaseLayout(props: BaseLayoutProps) {
  if (props.template === 'modern') return <ModernLayout {...props} />
  if (props.template === 'classic') return <ClassicLayout {...props} />
  return <MinimalLayout {...props} />
}