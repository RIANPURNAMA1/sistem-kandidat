import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Users, Calendar, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

export default function ProgramDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { data: program, isLoading } = useQuery({ queryKey: ['program', slug], queryFn: async () => { const { data } = await api.get(`/programs/${slug}`); return data.data } })

  const applyMutation = useMutation({
    mutationFn: async () => {
      const profile = await api.get('/candidates/profile')
      return api.post(`/programs/${program.id}/apply`, { candidateId: profile.data.data.id })
    },
    onSuccess: () => { toast({ title: 'Pendaftaran berhasil!' }); navigate('/candidate/applications') },
    onError: (err: any) => toast({ title: 'Gagal mendaftar', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse"><div className="h-10 bg-muted rounded mb-4" /><div className="h-64 bg-muted rounded" /></div>
  if (!program) return <div className="max-w-4xl mx-auto px-4 py-12 text-center"><p>Program tidak ditemukan</p></div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="text-sm text-primary font-medium mb-2">{program.category?.name}</p>
        <h1 className="text-3xl font-bold mb-4">{program.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Globe className="h-4 w-4" /> {program.country}</span>
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {program.duration}</span>
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Kuota: {program.quota} orang</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(program.status)}`}>{getStatusLabel(program.status)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card><CardContent className="p-6"><h2 className="font-bold text-lg mb-3">Deskripsi Program</h2><p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{program.description}</p></CardContent></Card>
          <Card><CardContent className="p-6"><h2 className="font-bold text-lg mb-3">Persyaratan</h2><div className="space-y-2">{program.requirements?.split('\n').map((r: string, i: number) => <div key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" /><span>{r}</span></div>)}</div></CardContent></Card>
          {program.benefits && <Card><CardContent className="p-6"><h2 className="font-bold text-lg mb-3">Benefit</h2><div className="space-y-2">{program.benefits?.split('\n').map((b: string, i: number) => <div key={i} className="flex items-start gap-2 text-sm"><CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" /><span>{b}</span></div>)}</div></CardContent></Card>}
        </div>
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardContent className="p-6 space-y-4">
              <div className="text-center"><p className="text-xs text-muted-foreground">Biaya Program</p><p className="text-3xl font-bold text-primary">{formatCurrency(program.fee)}</p></div>
              {isAuthenticated && user?.role === 'KANDIDAT' ? (
                <Button className="w-full" size="lg" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || program.status !== 'AKTIF'}>
                  {applyMutation.isPending ? 'Mendaftarkan...' : 'Daftar Program Ini'}
                </Button>
              ) : !isAuthenticated ? (
                <Button className="w-full" size="lg" onClick={() => navigate('/login')}>Masuk untuk Mendaftar</Button>
              ) : null}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ Proses transparan dan jelas</p>
                <p>✓ Didampingi oleh tim profesional</p>
                <p>✓ Garansi dokumen resmi</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
