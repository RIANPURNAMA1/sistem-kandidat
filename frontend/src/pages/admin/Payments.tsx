import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, CheckCircle, XCircle, Receipt, Banknote, User as UserIcon, Calendar, Info, ScanLine, Zap, Loader2, Filter, ChevronDown, Download, RefreshCw } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  MENUNGGU_UPLOAD:       { label: 'Menunggu Upload',      dot: 'bg-slate-400',   text: 'text-slate-600',  bg: 'bg-slate-50' },
  MENUNGGU_VERIFIKASI:   { label: 'Menunggu Verifikasi',  dot: 'bg-amber-400',   text: 'text-amber-700',  bg: 'bg-amber-50' },
  VALID:                 { label: 'Valid',                dot: 'bg-emerald-500', text: 'text-emerald-700',bg: 'bg-emerald-50' },
  DITOLAK:               { label: 'Ditolak',              dot: 'bg-red-500',     text: 'text-red-700',    bg: 'bg-red-50' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function OcrBadge({ value }: { value: number }) {
  const good = value >= 80
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tabular-nums',
      good ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
    )}>
      {value.toFixed(0)}%
    </span>
  )
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient()
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [rejectReason, setRejectReason] = useState('')
  const [confirmStatus, setConfirmStatus] = useState<'VALID' | 'DITOLAK' | ''>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [showFilter, setShowFilter] = useState(false)
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
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
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
    queryKey: ['admin-payments', statusFilter, dateStart, dateEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      if (dateStart) params.set('startDate', dateStart)
      if (dateEnd) params.set('endDate', dateEnd)
      const { data } = await api.get(`/payments?${params}`)
      return data
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, rejectedReason }: { id: string; status: string; rejectedReason?: string }) =>
      api.put(`/payments/${id}/verify`, { status, rejectedReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      queryClient.invalidateQueries({ queryKey: ['pending-payment-count'] })
      setIsModalOpen(false)
      setSelectedPayment(null)
    },
  })

  const bulkVerifyMutation = useMutation({
    mutationFn: async ({ ids, status, rejectedReason }: { ids: string[]; status: string; rejectedReason?: string }) =>
      api.post('/payments/bulk-verify', { paymentIds: ids, status, rejectedReason }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      queryClient.invalidateQueries({ queryKey: ['pending-payment-count'] })
      setSelectedIds([])
      toast({
        title: res.data.message,
        description: res.data.data?.processedCount > 0
          ? `${res.data.data.processedCount} pembayaran diproses`
          : 'Tidak ada pembayaran yang dapat diproses',
      })
    },
    onError: () => toast({ title: 'Gagal memproses', variant: 'destructive' }),
  })

  const verifiablePayments = data?.data?.filter((p: any) => p.status === 'MENUNGGU_VERIFIKASI') || []

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === verifiablePayments.length ? [] : verifiablePayments.map((p: any) => p.id))

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const handleBulkAction = (status: 'VALID' | 'DITOLAK') => {
    if (!selectedIds.length) return
    setPendingIds(selectedIds)
    setConfirmStatus(status)
    setRejectReason('')
    setConfirmOpen(true)
  }

  const handleDialogClose = () => {
    setConfirmOpen(false)
    setPendingIds([])
    setRejectReason('')
    setConfirmStatus('')
  }

  const handleConfirmAction = () => {
    bulkVerifyMutation.mutate({
      ids: pendingIds,
      status: confirmStatus,
      rejectedReason: confirmStatus === 'DITOLAK' ? rejectReason || 'Ditolak' : undefined,
    })
    handleDialogClose()
    setSelectedIds([])
  }

  const payments: any[] = data?.data ?? []

  const exportCSV = () => {
    const headers = ['Kandidat', 'Program', 'Nominal', 'Status', 'Penerima', 'Bank', 'Tgl Transfer', 'Confidence', 'Waktu Upload']
    const rows = payments.map((p: any) => [
      p.candidate?.fullName || '',
      p.application?.program?.name || '',
      p.amount,
      p.status,
      p.receiverName || '',
      `${p.bankFrom || ''} -> ${p.bankTo || ''}`,
      p.transferDate ? new Date(p.transferDate).toLocaleDateString('id-ID') : '',
      p.ocrConfidence != null ? `${p.ocrConfidence.toFixed(0)}%` : '',
      p.createdAt ? new Date(p.createdAt).toLocaleString('id-ID') : '',
    ])

    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pembayaran-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'CSV berhasil diexport' })
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">

        {/* ── Toolbar Atas ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-[17px] font-semibold text-slate-800">Monitoring Pembayaran</h2>
            <span className="text-sm text-slate-400">
              {data?.pagination?.total || payments.length} transaksi
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={cn(
                'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border transition-all',
                showFilter
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
              {(statusFilter || dateStart || dateEnd) && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>

            {selectedIds.length > 0 && (
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500">{selectedIds.length} dipilih</span>
                <div className="w-px h-4 bg-slate-200" />
                <button
                  onClick={() => handleBulkAction('VALID')}
                  className="h-7 px-2.5 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >Setujui</button>
                <button
                  onClick={() => handleBulkAction('DITOLAK')}
                  className="h-7 px-2.5 rounded-md text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >Tolak</button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="h-7 px-2.5 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >✕</button>
              </div>
            )}

            <button
              onClick={() => autoVerifyMutation.mutate()}
              disabled={autoVerifyMutation.isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
            >
              {autoVerifyMutation.isPending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memverifikasi...</>
                : <><Zap className="h-3.5 w-3.5" /> Auto Verifikasi</>
              }
            </button>
          </div>
        </div>

        {/* ── Auto-verify Progress ───────────────────────── */}
        {autoProgress > 0 && (
          <div className="mx-5 mt-3 bg-emerald-50 border border-emerald-200 rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Auto-verifikasi berjalan...</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 tabular-nums">{autoProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                style={{ width: `${autoProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Filter Panel ───────────────────────────────── */}
        {showFilter && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { value: '', label: 'Semua Status' },
                  { value: 'MENUNGGU_UPLOAD', label: 'Menunggu Upload' },
                  { value: 'MENUNGGU_VERIFIKASI', label: 'Menunggu Verifikasi' },
                  { value: 'VALID', label: 'Valid' },
                  { value: 'DITOLAK', label: 'Ditolak' },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold border transition-all',
                      statusFilter === s.value
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateStart}
                  onChange={e => setDateStart(e.target.value)}
                  className="h-8 rounded border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                />
                <span className="text-slate-300 text-xs">→</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={e => setDateEnd(e.target.value)}
                  className="h-8 rounded border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="w-12 px-4 py-3.5 text-center border border-slate-100 bg-slate-50/50">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 accent-indigo-500 h-4 w-4 cursor-pointer"
                    checked={selectedIds.length > 0 && selectedIds.length === verifiablePayments.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                {['Kandidat', 'Program', 'Nominal', 'Status', 'Penerima', 'Bank', 'Tgl Transfer', 'OCR', 'Waktu Upload', ''].map((h, i) => (
                  <th
                    key={h + i}
                    className={cn(
                      'px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-100 bg-slate-50/50',
                      i === 8 ? 'text-right' : 'text-left'
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {isLoading && [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3.5 border border-slate-100">
                    <div className="h-3 w-3 bg-slate-100 rounded mx-auto" />
                  </td>
                  {[140, 160, 80, 90, 110, 80, 70, 40, 80].map((w, j) => (
                    <td key={j} className="px-4 py-3.5 border border-slate-100">
                      <div className="h-3 bg-slate-100 rounded" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!isLoading && payments.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-sm text-slate-400 border border-slate-100">
                    Tidak ada data pembayaran
                  </td>
                </tr>
              )}

              {payments.map((p: any) => (
                <tr
                  key={p.id}
                  className={cn(
                    'group hover:bg-slate-50/60 transition-colors',
                    selectedIds.includes(p.id) ? 'bg-indigo-50/40' : ''
                  )}
                >
                  <td className="px-4 py-[13px] text-center border border-slate-100">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 accent-indigo-500 h-4 w-4 cursor-pointer disabled:opacity-30"
                      checked={selectedIds.includes(p.id)}
                      disabled={p.status !== 'MENUNGGU_VERIFIKASI'}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>

                  {/* Kandidat */}
                  <td className="px-4 py-[13px] border border-slate-100">
                    <p className="font-semibold text-slate-800 leading-tight">{p.candidate?.fullName}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{p.candidate?.phone}</p>
                  </td>

                  {/* Program */}
                  <td className="px-4 py-[13px] max-w-[180px] border border-slate-100">
                    <p className="text-xs text-slate-600 font-medium truncate" title={p.application?.program?.name}>
                      {p.application?.program?.name || '—'}
                    </p>
                  </td>

                  {/* Nominal */}
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className="font-semibold text-indigo-600 tabular-nums">
                      {formatCurrency(p.amount)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-[13px] border border-slate-100">
                    <StatusBadge status={p.status} />
                  </td>

                  {/* Penerima */}
                  <td className="px-4 py-[13px] border border-slate-100">
                    {p.receiverName ? (
                      <div>
                        <p className="text-xs font-medium text-slate-700">{p.receiverName}</p>
                        {p.senderName && <p className="text-[11px] text-slate-400">dari {p.senderName}</p>}
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>

                  {/* Bank */}
                  <td className="px-4 py-[13px] border border-slate-100">
                    {(p.bankFrom || p.bankTo) ? (
                      <div className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <span className="font-medium">{p.bankFrom || '?'}</span>
                        <span className="text-slate-300">›</span>
                        <span className="font-medium">{p.bankTo || '?'}</span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>

                  {/* Tgl Transfer */}
                  <td className="px-4 py-[13px] border border-slate-100">
                    {p.transferDate ? (
                      <span className="text-xs text-slate-500 tabular-nums">
                        {new Date(p.transferDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>

                  {/* OCR */}
                  <td className="px-4 py-[13px] border border-slate-100">
                    {p.ocrConfidence != null
                      ? <OcrBadge value={p.ocrConfidence} />
                      : <span className="text-slate-300">—</span>
                    }
                  </td>

                  {/* Waktu */}
                  <td className="px-4 py-[13px] text-right border border-slate-100">
                    <span className="text-[11px] text-slate-400 tabular-nums font-mono">
                      {formatDateTime(p.createdAt)}
                    </span>
                  </td>

                  {/* Aksi */}
                  <td className="px-4 py-[13px] text-right border border-slate-100">
                    <button
                      onClick={() => { setSelectedPayment(p); setIsModalOpen(true) }}
                      className="h-7 w-7 rounded inline-flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!isLoading && payments.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
            <p className="text-xs text-slate-400">
              Menampilkan <span className="font-semibold text-slate-600">{payments.length}</span> transaksi
            </p>
            {selectedIds.length > 0 && (
              <p className="text-xs text-indigo-600 font-semibold">{selectedIds.length} dipilih</p>
            )}
          </div>
        )}
      </div>

      {/* ── Detail Modal ───────────────────────────────── */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-[51] focus:outline-none">
            {selectedPayment && (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-sm font-bold text-slate-900">Detail Pembayaran</Dialog.Title>
                      <p className="text-[10px] text-slate-400 font-mono">{selectedPayment.id}</p>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <button className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg">
                      ✕
                    </button>
                  </Dialog.Close>
                </div>

                <div className="p-6 space-y-5">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedPayment.status} />
                    {selectedPayment.rejectedReason && (
                      <span className="text-xs text-red-600 font-medium">
                        Alasan: {selectedPayment.rejectedReason}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    {/* Left */}
                    <div className="space-y-4">
                      <Section title="Kandidat" icon={<UserIcon className="h-3 w-3" />}>
                        <p className="font-bold text-slate-900">{selectedPayment.candidate?.fullName}</p>
                        <p className="text-xs text-slate-500">{selectedPayment.candidate?.phone}</p>
                      </Section>

                      <Section title="Program" icon={<Receipt className="h-3 w-3" />}>
                        <p className="text-sm font-medium text-slate-700">{selectedPayment.application?.program?.name}</p>
                      </Section>

                      <Section title="Rincian Pembayaran" icon={<Banknote className="h-3 w-3" />}>
                        <Row label="Nominal" value={<span className="font-bold text-blue-600">{formatCurrency(selectedPayment.amount)}</span>} />
                        <Row label="Waktu Upload" value={selectedPayment.uploadedAt ? formatDateTime(selectedPayment.uploadedAt) : '—'} />
                      </Section>

                      {selectedPayment.ocrData && (
                        <Section title="Hasil OCR" icon={<ScanLine className="h-3 w-3" />} accent>
                          <Row label="Pengirim" value={selectedPayment.senderName || '—'} />
                          <Row label="Penerima" value={selectedPayment.receiverName || '—'} />
                          <Row label="Bank" value={`${selectedPayment.bankFrom || '?'} → ${selectedPayment.bankTo || '?'}`} />
                          <Row label="No. Referensi" value={<span className="font-mono text-[10px]">{selectedPayment.referenceNumber || '—'}</span>} />
                          <Row label="Tanggal" value={selectedPayment.transferDate
                            ? new Date(selectedPayment.transferDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '—'
                          } />
                          <div className="pt-2 mt-2 border-t border-amber-200 flex justify-between items-center">
                            <span className="text-[11px] text-slate-500 font-medium">Confidence</span>
                            <OcrBadge value={selectedPayment.ocrConfidence} />
                          </div>
                        </Section>
                      )}
                    </div>

                    {/* Right: Proof */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bukti Pembayaran</p>
                      <div className="aspect-[3/4] rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                        {selectedPayment.proofUrl ? (
                          <img
                            src={selectedPayment.proofUrl}
                            alt="Bukti Pembayaran"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center">
                            <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Belum diupload</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedPayment.status === 'MENUNGGU_VERIFIKASI' ? (
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button
                        className="flex-1 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate({ id: selectedPayment.id, status: 'VALID' })}
                      >
                        <CheckCircle className="h-4 w-4" /> Setujui
                      </button>
                      <button
                        className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                        disabled={verifyMutation.isPending}
                        onClick={() => {
                          const reason = prompt('Masukkan alasan penolakan:')
                          if (reason) verifyMutation.mutate({ id: selectedPayment.id, status: 'DITOLAK', rejectedReason: reason })
                        }}
                      >
                        <XCircle className="h-4 w-4" /> Tolak
                      </button>
                    </div>
                  ) : (
                    <p className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
                      Diverifikasi pada {formatDateTime(selectedPayment.verifiedAt || selectedPayment.updatedAt)}
                    </p>
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Confirm Dialog ─────────────────────────────── */}
      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-50 focus:outline-none">
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center mb-4',
              confirmStatus === 'VALID' ? 'bg-emerald-100' : 'bg-red-100'
            )}>
              {confirmStatus === 'VALID'
                ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                : <XCircle className="h-5 w-5 text-red-600" />
              }
            </div>
            <Dialog.Title className="text-base font-bold text-slate-900">
              {confirmStatus === 'VALID' ? 'Konfirmasi Persetujuan' : 'Konfirmasi Penolakan'}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-slate-500 mt-1 mb-4">
              {confirmStatus === 'VALID'
                ? `Setujui ${pendingIds.length} pembayaran yang menunggu verifikasi?`
                : `Tolak ${pendingIds.length} pembayaran. Masukkan alasan:`
              }
            </Dialog.Description>

            {confirmStatus === 'DITOLAK' && (
              <textarea
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl mb-4 outline-none focus:border-red-400 resize-none"
                rows={3}
                placeholder="Alasan penolakan..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={handleDialogClose}
                className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >Batal</button>
              <button
                onClick={handleConfirmAction}
                disabled={bulkVerifyMutation.isPending}
                className={cn(
                  'flex-1 h-9 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60',
                  confirmStatus === 'VALID'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {bulkVerifyMutation.isPending ? 'Memproses...' : confirmStatus === 'VALID' ? 'Setujui' : 'Tolak'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────
function Section({ title, icon, children, accent }: { title: string; icon?: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
        {icon}{title}
      </p>
      <div className={cn('p-3 rounded-xl border text-xs space-y-1', accent ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100')}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 text-right">{value}</span>
    </div>
  )
}