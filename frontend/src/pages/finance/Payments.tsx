import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, CheckCircle, XCircle, ScanLine, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea, Label } from '@/components/ui/index'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

const STATUS_PILLS = [
  { label: 'Menunggu Upload',     value: 'MENUNGGU_UPLOAD' },
  { label: 'Menunggu Verifikasi', value: 'MENUNGGU_VERIFIKASI' },
  { label: 'Valid',               value: 'VALID' },
  { label: 'Ditolak',             value: 'DITOLAK' },
]

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; text: string; bg: string }> = {
    MENUNGGU_UPLOAD:      { label: 'Menunggu Upload',     text: 'text-slate-600',  bg: 'bg-slate-50' },
    MENUNGGU_VERIFIKASI:  { label: 'Menunggu Verifikasi', text: 'text-amber-700',  bg: 'bg-amber-50' },
    VALID:                { label: 'Valid',               text: 'text-emerald-700', bg: 'bg-emerald-50' },
    DITOLAK:              { label: 'Ditolak',             text: 'text-red-700',    bg: 'bg-red-50' },
  }
  const s = cfg[status] ?? { label: status, text: 'text-slate-600', bg: 'bg-slate-50' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'VALID' ? 'bg-emerald-500' : status === 'DITOLAK' ? 'bg-red-500' : status === 'MENUNGGU_VERIFIKASI' ? 'bg-amber-400' : 'bg-slate-400')} />
      {s.label}
    </span>
  )
}

export default function FinancePayments() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('MENUNGGU_VERIFIKASI')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [autoProgress, setAutoProgress] = useState(0)
  const progressRef = useRef<ReturnType<typeof setInterval>>()
  const autoStartRef = useRef(0)

  const autoVerifyMutation = useMutation({
    mutationFn: async () => {
      autoStartRef.current = Date.now()
      const { data } = await api.post('/payments/auto-verify')
      return data.data
    },
    onSuccess: async (res) => {
      const elapsed = Date.now() - autoStartRef.current
      if (elapsed < 10000) await new Promise(r => setTimeout(r, 10000 - elapsed))
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['pending-payment-count'] })
      toast({ title: 'Auto-verifikasi selesai', description: `${res.verified} berhasil, ${res.skipped} dilewati` })
    },
    onError: async () => {
      const elapsed = Date.now() - autoStartRef.current
      if (elapsed < 10000) await new Promise(r => setTimeout(r, 10000 - elapsed))
      toast({ title: 'Gagal auto-verifikasi', variant: 'destructive' })
    },
  })

  useEffect(() => {
    if (autoVerifyMutation.isPending) {
      setAutoProgress(0)
      progressRef.current = setInterval(() => setAutoProgress(p => Math.min(p + 2, 95)), 200)
    } else {
      clearInterval(progressRef.current)
      if (autoProgress > 0) setAutoProgress(100)
      setTimeout(() => setAutoProgress(0), 400)
    }
    return () => clearInterval(progressRef.current)
  }, [autoVerifyMutation.isPending])

  const { data, isLoading } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/payments?${params}`)
      return data
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ paymentId, status, reason }: { paymentId: string; status: string; reason?: string }) => {
      return api.put(`/payments/${paymentId}/verify`, { status, rejectedReason: reason })
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.status === 'VALID' ? 'Pembayaran Disetujui' : 'Pembayaran Ditolak' })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['pending-payment-count'] })
      setSelectedPayment(null)
      setRejectReason('')
    },
    onError: () => toast({ title: 'Gagal memverifikasi', variant: 'destructive' }),
  })

  const payments: any[] = data?.data ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Verifikasi Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-0.5">Periksa dan verifikasi bukti transfer kandidat</p>
        </div>

        <button
          onClick={() => autoVerifyMutation.mutate()}
          disabled={autoVerifyMutation.isPending}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold border transition-all',
            autoVerifyMutation.isPending
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
          )}
        >
          {autoVerifyMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {autoVerifyMutation.isPending ? 'Memproses...' : 'Auto Verifikasi'}
        </button>
      </div>

      {autoProgress > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">Auto-verifikasi berjalan...</span>
            <span className="text-[10px] font-bold text-slate-400">{autoProgress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-800 rounded-full transition-all duration-200 ease-out"
              style={{ width: `${autoProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex gap-1.5 flex-wrap bg-white p-1.5 rounded-xl border border-slate-200 w-fit">
          {STATUS_PILLS.map(pill => (
            <button
              key={pill.value}
              onClick={() => { setStatusFilter(pill.value); setSelectedPayment(null) }}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                statusFilter === pill.value
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* List */}
          <div className="lg:col-span-2 overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white self-start">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4 text-left border border-slate-200">Kandidat</th>
                  <th className="px-6 py-4 text-left border border-slate-200">Program</th>
                  <th className="px-6 py-4 text-left border border-slate-200">Nominal</th>
                  <th className="px-6 py-4 text-left border border-slate-200">Status</th>
                  <th className="px-6 py-4 text-right border border-slate-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(5)].map((_, j) => <td key={j} className="px-6 py-4 border border-slate-200"><div className="h-4 bg-slate-100 rounded w-20" /></td>)}
                  </tr>
                ))}
                {payments.map((p: any) => (
                  <tr key={p.id} className={cn('hover:bg-slate-50 transition-colors cursor-pointer', selectedPayment?.id === p.id ? 'bg-slate-50' : '')}
                      onClick={() => setSelectedPayment(p)}>
                    <td className="px-6 py-4 font-semibold text-slate-900 border border-slate-200">{p.candidate?.fullName}</td>
                    <td className="px-6 py-4 text-slate-600 text-[11px] border border-slate-200">{p.application?.program?.name}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 border border-slate-200">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4 border border-slate-200"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4 text-right border border-slate-200">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-100" onClick={() => setSelectedPayment(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && !payments.length && (
                  <tr><td colSpan={5} className="text-center text-slate-500 py-20 font-medium border border-slate-200">Tidak ada data pembayaran</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-fit sticky top-20">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
              <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center">
                <Eye className="h-3 w-3 text-slate-600" />
              </div>
              <span className="text-sm font-bold text-slate-900">Detail Pembayaran</span>
            </div>
            <div className="p-5">
              {!selectedPayment ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Eye className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-xs font-medium text-slate-400">Pilih pembayaran untuk melihat detail</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {selectedPayment.proofUrl && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bukti Transfer</Label>
                      <a href={selectedPayment.proofUrl} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:shadow-md transition-shadow">
                        <img src={selectedPayment.proofUrl} alt="Bukti transfer" className="w-full h-full object-contain" />
                      </a>
                    </div>
                  )}

                  {selectedPayment.ocrConfidence && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI OCR</p>
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between border-b border-slate-200 pb-1.5"><span className="text-slate-500">Nama Pengirim</span><span className="font-bold text-slate-900">{selectedPayment.senderName || '—'}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-1.5"><span className="text-slate-500">Bank Pengirim</span><span className="font-bold text-slate-900">{selectedPayment.bankFrom || '—'}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-1.5"><span className="text-slate-500">Confidence</span>
                          <span className={cn('font-bold', (selectedPayment.ocrConfidence || 0) >= 80 ? 'text-emerald-600' : 'text-amber-600')}>
                            {selectedPayment.ocrConfidence?.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">No. Referensi</span><span className="font-bold text-slate-900 font-mono">{selectedPayment.referenceNumber || '—'}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Kandidat</span><span className="font-bold text-slate-900">{selectedPayment.candidate?.fullName}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Nominal</span><span className="font-bold text-slate-900">{formatCurrency(selectedPayment.amount)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Waktu Upload</span><span className="font-medium text-slate-600">{selectedPayment.uploadedAt ? formatDateTime(selectedPayment.uploadedAt) : '—'}</span></div>
                  </div>

                  {selectedPayment.status === 'MENUNGGU_VERIFIKASI' && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alasan Penolakan</Label>
                        <Textarea
                          placeholder="Berikan alasan jika pembayaran ditolak..."
                          className="text-xs rounded-xl border-slate-200"
                          rows={3}
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-10 rounded-xl font-bold text-xs"
                          onClick={() => verifyMutation.mutate({ paymentId: selectedPayment.id, status: 'VALID' })}
                          disabled={verifyMutation.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Setujui
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1 h-10 rounded-xl font-bold text-xs"
                          onClick={() => verifyMutation.mutate({ paymentId: selectedPayment.id, status: 'DITOLAK', reason: rejectReason })}
                          disabled={verifyMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Tolak
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
