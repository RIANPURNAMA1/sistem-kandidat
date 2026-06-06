import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, CreditCard, ClipboardList, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

export default function CandidateDashboard() {
  const { user } = useAuthStore()
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data } = await api.get('/candidates/profile')
      return data.data
    },
  })

  const applications = profile?.applications || []
  const documents = profile?.documents || []
  const completedDocs = documents.filter((d: any) => d.status === 'VERIFIED').length
  const pendingPayments = applications.filter((a: any) => a.payment?.status === 'MENUNGGU_UPLOAD').length

  return (
    <div className="space-y-6">
      {/* Welcome banner - Facebook blue */}
      <div className="bg-gradient-to-r from-fb-blue to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-xl font-bold">
          Selamat datang, {profile?.fullName || user?.email}
        </h1>
        <p className="text-blue-200 text-sm mt-1">Pantau status pendaftaran dan dokumen Anda di sini</p>
      </div>

      {/* Alerts */}
      {pendingPayments > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">Pembayaran Menunggu Upload</p>
            <p className="text-xs text-orange-600">Anda memiliki {pendingPayments} pembayaran yang belum diupload</p>
          </div>
          <Link to="/candidate/payments">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">Upload Sekarang</Button>
          </Link>
        </div>
      )}

      {!profile && (
        <div className="flex items-center gap-3 p-4 bg-fb-blue-light border border-fb-blue/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-fb-blue flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-fb-blue">Profil Belum Lengkap</p>
            <p className="text-xs text-blue-600">Lengkapi profil Anda untuk dapat mendaftar program</p>
          </div>
          <Link to="/candidate/profile">
            <Button size="sm">Lengkapi Profil</Button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-fb-blue-light rounded-lg flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-fb-blue" />
            </div>
            <div>
              <p className="text-2xl font-bold">{applications.length}</p>
              <p className="text-xs text-muted-foreground">Pendaftaran</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedDocs}/{documents.length}</p>
              <p className="text-xs text-muted-foreground">Dokumen Terverifikasi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{applications.filter((a: any) => a.payment?.status === 'VALID').length}</p>
              <p className="text-xs text-muted-foreground">Pembayaran Valid</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications timeline */}
      <Card>
        <CardHeader><CardTitle>Status Pendaftaran</CardTitle></CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Belum ada pendaftaran program</p>
              <Link to="/programs"><Button>Lihat Program Tersedia</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app: any) => (
                <div key={app.id} className="border border-fb-gray-light rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{app.program?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Didaftarkan: {formatDate(app.submittedAt)}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(app.status)}`}>
                      {getStatusLabel(app.status)}
                    </span>
                  </div>

                  {app.payment && (
                    <div className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-md ${getStatusColor(app.payment.status)}`}>
                      {app.payment.status === 'VALID' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      Pembayaran: {getStatusLabel(app.payment.status)} — {formatCurrency(app.payment.amount)}
                    </div>
                  )}

                  {app.statusHistory?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {app.statusHistory.slice(0, 3).map((h: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                          <span className={`font-medium ${getStatusColor(h.status)} px-1.5 py-0.5 rounded text-[10px]`}>{getStatusLabel(h.status)}</span>
                          {h.notes && <span>— {h.notes}</span>}
                          <span className="ml-auto">{formatDate(h.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
