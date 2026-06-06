import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, FileText, CreditCard, Mail, Phone, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, cn } from '@/lib/utils'
import api from '@/services/api'

const DOC_STATUS: Record<string, { label: string; text: string; bg: string }> = {
  MENUNGGU:    { label: 'Menunggu',  text: 'text-amber-700',  bg: 'bg-amber-50' },
  VALID:       { label: 'Valid',     text: 'text-emerald-700', bg: 'bg-emerald-50' },
  DITOLAK:     { label: 'Ditolak',   text: 'text-red-700',    bg: 'bg-red-50' },
}

const APP_STATUS: Record<string, { label: string; text: string; bg: string }> = {
  DIPROSES:    { label: 'Diproses',  text: 'text-amber-700',  bg: 'bg-amber-50' },
  DITERIMA:    { label: 'Diterima',  text: 'text-emerald-700', bg: 'bg-emerald-50' },
  DITOLAK:     { label: 'Ditolak',   text: 'text-red-700',    bg: 'bg-red-50' },
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 mt-0.5">{value}</dd>
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
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-7 w-48 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-80 bg-slate-50 rounded-xl border border-slate-200 animate-pulse" />
        <div className="space-y-4">
          <div className="h-48 bg-slate-50 rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-48 bg-slate-50 rounded-xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  )

  if (!candidate) return (
    <div className="p-6">
      <div className="text-center py-20">
        <p className="text-slate-500 font-medium">Kandidat tidak ditemukan</p>
      </div>
    </div>
  )

  const fields = [
    ['NIK', candidate.nik],
    ['Nama Lengkap', candidate.fullName],
    ['Tempat, Tgl Lahir', candidate.birthDate ? `${candidate.birthPlace || ''}, ${formatDate(candidate.birthDate)}` : candidate.birthPlace],
    ['Jenis Kelamin', candidate.gender],
    ['Status Nikah', candidate.maritalStatus],
    ['Telepon', candidate.phone],
    ['Alamat', candidate.address],
    ['Kecamatan', candidate.kecamatan],
    ['Kabupaten', candidate.kabupaten],
    ['Provinsi', candidate.provinsi],
    ['Pendidikan', candidate.lastEducation],
    ['Tinggi / Berat', candidate.height ? `${candidate.height}cm / ${candidate.weight}kg` : ''],
    ['Gol. Darah', candidate.bloodType],
    ['Pekerjaan Ayah', candidate.fatherOccupation],
    ['Pekerjaan Ibu', candidate.motherOccupation],
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-9 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Kembali
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Data Diri ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
              <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center">
                <User className="h-3 w-3 text-slate-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Data Diri</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="text-lg font-extrabold text-slate-500">
                    {candidate.fullName?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{candidate.fullName}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.user?.email}</span>
                    <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{candidate.phone}</span>
                    {candidate.birthDate && (
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(candidate.birthDate)}</span>
                    )}
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                {fields.map(([label, value]) => (
                  <InfoRow key={label} label={label} value={value} />
                ))}
              </dl>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* ── Dokumen ── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center">
                <FileText className="h-3 w-3 text-slate-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Dokumen ({candidate.documents?.length ?? 0})</h2>
            </div>
            <div className="p-5 space-y-2">
              {candidate.documents?.length ? (
                candidate.documents.map((d: any) => {
                  const cfg = DOC_STATUS[d.status] ?? { label: d.status, text: 'text-slate-600', bg: 'bg-slate-50' }
                  return (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <span className="text-xs font-semibold text-slate-800">{d.type}</span>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', cfg.bg, cfg.text)}>
                        {cfg.label}
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Belum ada dokumen</p>
              )}
            </div>
          </div>

          {/* ── Pendaftaran ── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center">
                <CreditCard className="h-3 w-3 text-slate-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Pendaftaran ({candidate.applications?.length ?? 0})</h2>
            </div>
            <div className="p-5 space-y-2">
              {candidate.applications?.length ? (
                candidate.applications.map((a: any) => {
                  const cfg = APP_STATUS[a.status] ?? { label: a.status, text: 'text-slate-600', bg: 'bg-slate-50' }
                  return (
                    <div key={a.id} className="p-3 rounded-lg border border-slate-200">
                      <p className="text-xs font-bold text-slate-900 truncate">{a.program?.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400 font-mono">{formatDate(a.submittedAt)}</span>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', cfg.bg, cfg.text)}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Belum ada pendaftaran</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
