import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/index'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/toaster'

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background selection:bg-primary/20 p-4">
      {/* Wrapper Ultra-Minimalis */}
      <div className="w-full max-w-[340px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-start mb-10">
          <img 
            src="/logo2.png" 
            alt="mendunia.id" 
            className="h-8 w-auto mb-1 opacity-90" 
          />
          <p className="text-sm text-muted-foreground mt-2">
            Selamat datang kembali di Mendunia
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              className="h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm px-3"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-rose-500 font-medium animate-in fade-in">
                {errors.email.message}
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
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-rose-500 font-medium animate-in fade-in">
                {errors.password.message}
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

        {/* Alternative Login (Sangat Halus) */}
        <div className="mt-6">
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 rounded-md bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-sm font-medium transition-all shadow-none"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 mr-2 opacity-80" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Lanjutkan dengan WhatsApp
          </Button>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground/60 font-mono">
            Demo: admin@system.com / password123
          </p>
        </div>

      </div>
    </div>
  )
}