import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, Calendar, MapPin, FileText, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import api from '@/services/api'

const DOC_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  MENUNGGU:    { label: 'Menunggu',  variant: 'secondary' },
  VALID:       { label: 'Valid',     variant: 'default' },
  DITOLAK:     { label: 'Ditolak',   variant: 'destructive' },
}

const APP_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DIPROSES:    { label: 'Diproses',  variant: 'secondary' },
  DITERIMA:    { label: 'Diterima',  variant: 'default' },
  DITOLAK:     { label: 'Ditolak',   variant: 'destructive' },
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className="text-sm font-semibold text-foreground mt-0.5">{value}</dd>
    </div>
  )
}

export default function AdminCandidateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => { const { data } = await api.get(`/candidates/${id}`); return data.data },
  })

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-9 w-24 bg-muted rounded-md" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[400px] bg-muted/30 rounded-sm border border-border" />
        <div className="space-y-4">
          <div className="h-48 bg-muted/30 rounded-sm border border-border" />
          <div className="h-48 bg-muted/30 rounded-sm border border-border" />
        </div>
      </div>
    </div>
  )

  if (!candidate) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground font-medium">Kandidat tidak ditemukan</p>
    </div>
  )

  const fields = [
    ['NIK', candidate.nik],
    ['Nama Lengkap', candidate.fullName],
    ['Tempat, Tgl Lahir', candidate.birthDate ? `${candidate.birthPlace || ''}, ${formatDate(candidate.birthDate)}` : candidate.birthPlace],
    ['Jenis Kelamin', candidate.gender],
    ['Status Nikah', candidate.maritalStatus],
    ['Telepon', candidate.phone],
    ['Pendidikan', candidate.lastEducation],
    ['Tinggi / Berat', candidate.height ? `${candidate.height}cm / ${candidate.weight}kg` : ''],
    ['Gol. Darah', candidate.bloodType],
    ['Pekerjaan Ayah', candidate.fatherOccupation],
    ['Pekerjaan Ibu', candidate.motherOccupation],
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Kembali
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile Card */}
          <Card>
            <div className="flex items-start gap-5 p-6 pb-5 border-b border-border">
              <div className="h-16 w-16 rounded-full bg-[#009ce1] flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">
                  {candidate.fullName?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-base font-bold text-foreground">{candidate.fullName}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />{candidate.user?.email}</span>
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{candidate.phone}</span>
                  {candidate.birthDate && (
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" />{formatDate(candidate.birthDate)}</span>
                  )}
                  {candidate.kabupaten && (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" />{candidate.kabupaten}, {candidate.provinsi}</span>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <h3 className="text-xs font-bold text-foreground mb-4">Informasi Pribadi</h3>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                {fields.map(([label, value]) => (
                  <InfoRow key={label} label={label} value={value} />
                ))}
                {candidate.address && (
                  <div className="col-span-2">
                    <dt className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Alamat Lengkap</dt>
                    <dd className="text-sm font-semibold text-foreground mt-0.5">{candidate.address}, {candidate.kecamatan ? `Kec. ${candidate.kecamatan}, ` : ''}{candidate.kabupaten}, {candidate.provinsi}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Dokumen */}
          <Card>
            <CardHeader className="px-4 py-3 border-b border-border">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Dokumen ({candidate.documents?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              {candidate.documents?.length ? (
                candidate.documents.map((d: any) => {
                  const cfg = DOC_STATUS[d.status] ?? { label: d.status, variant: 'outline' }
                  return (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-sm border border-border hover:bg-muted/40 transition-colors">
                      <span className="text-xs font-medium text-foreground">{d.type}</span>
                      <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Belum ada dokumen</p>
              )}
            </CardContent>
          </Card>

          {/* Pendaftaran */}
          <Card>
            <CardHeader className="px-4 py-3 border-b border-border">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Pendaftaran ({candidate.applications?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              {candidate.applications?.length ? (
                candidate.applications.map((a: any) => {
                  const cfg = APP_STATUS[a.status] ?? { label: a.status, variant: 'outline' }
                  return (
                    <div key={a.id} className="px-3 py-2.5 rounded-sm border border-border hover:bg-muted/40 transition-colors">
                      <p className="text-xs font-semibold text-foreground truncate">{a.program?.name}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{formatDate(a.submittedAt)}</span>
                        <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Belum ada pendaftaran</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
