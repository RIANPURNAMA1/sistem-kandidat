import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ClipboardList, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

export default function CandidateApplicationsPage() {
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => { const { default: api } = await import('@/services/api'); const { data } = await api.get('/candidates/profile'); return data.data },
  })
  const applications = profile?.applications || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Riwayat Pendaftaran</h1>
          <p className="text-sm text-muted-foreground">Semua program yang telah Anda daftarkan</p>
        </div>
        <Link to="/programs"><Button variant="outline" className="gap-2">Cari Program <ArrowRight className="h-4 w-4" /></Button></Link>
      </div>
      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Belum ada pendaftaran</p>
            <Link to="/programs"><Button>Lihat Program Tersedia</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => (
            <Card key={app.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-base">{app.program?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Didaftarkan: {formatDate(app.submittedAt)}</p>
                    <div className="mt-3 space-y-1.5">
                      {app.statusHistory?.slice(0, 4).map((h: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(h.status)}`}>{getStatusLabel(h.status)}</span>
                          {h.notes && <span className="text-muted-foreground">— {h.notes}</span>}
                          <span className="ml-auto text-muted-foreground">{formatDate(h.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(app.status)}`}>{getStatusLabel(app.status)}</span>
                </div>
                {app.payment && (
                  <div className="mt-3 pt-3 border-t border-fb-gray-light flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pembayaran: <strong>{formatCurrency(app.payment.amount)}</strong></span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(app.payment.status)}`}>{getStatusLabel(app.payment.status)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
