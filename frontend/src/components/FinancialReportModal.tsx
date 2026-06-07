import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import api from '@/services/api'

const STATUS_COLORS: Record<string, string> = {
  VALID: '#10B981',
  MENUNGGU_VERIFIKASI: '#F59E0B',
  MENUNGGU_UPLOAD: '#F97316',
  DITOLAK: '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  VALID: 'Valid',
  MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  MENUNGGU_UPLOAD: 'Menunggu Upload',
  DITOLAK: 'Ditolak',
}

interface FinancialReportModalProps {
  open: boolean
  onClose: () => void
}

export default function FinancialReportModal({ open, onClose, period, customStart, customEnd }: FinancialReportModalProps) {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  const params = new URLSearchParams()
  if (dateRange.start) params.set('startDate', dateRange.start)
  if (dateRange.end) params.set('endDate', dateRange.end)
  const qs = params.toString()

  const { data, isLoading } = useQuery({
    queryKey: ['financial-report', qs],
    queryFn: async () => {
      const { data } = await api.get(`/reports/financial${qs ? `?${qs}` : ''}`)
      return data.data
    },
    enabled: open,
  })

  const handleExportCSV = () => {
    if (!data?.recentPayments?.length) return
    const headers = ['Tanggal', 'Kandidat', 'Program', 'Jumlah', 'Status']
    const rows = data.recentPayments.map((p: any) => [
      formatDateTime(p.date),
      p.candidateName,
      p.programName,
      p.amount,
      STATUS_LABELS[p.status] || p.status,
    ])
    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-keuangan-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white border border-[#009ce1]/20 rounded-sm shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#009ce1]/10 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-fb-blue flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#009ce1]" />
              Laporan Keuangan
            </h2>
            <p className="text-xs text-fb-gray-dark mt-0.5">Rekap pembayaran, pendapatan, dan komisi</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="h-8 rounded-sm border border-fb-gray-light bg-transparent px-2 text-xs outline-none focus:border-[#009ce1]"
            />
            <span className="text-xs text-fb-gray-dark">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="h-8 rounded-sm border border-fb-gray-light bg-transparent px-2 text-xs outline-none focus:border-[#009ce1]"
            />
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs gap-1.5 rounded-sm border-fb-gray-light">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-sm hover:bg-fb-gray transition-colors">
              <svg className="h-4 w-4 text-fb-gray-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-fb-gray-dark" />
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { title: 'Total Pendapatan', value: `Rp ${formatCurrency(data?.summary?.totalRevenue || 0)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { title: 'Pembayaran Valid', value: String(data?.summary?.totalValidPayments || 0), color: 'text-green-600', bg: 'bg-green-50' },
                  { title: 'Total Pembayaran', value: String(data?.summary?.totalPayments || 0), color: 'text-blue-600', bg: 'bg-blue-50' },
                  { title: 'Total Komisi', value: `Rp ${formatCurrency(data?.summary?.totalCommissionAmount || 0)}`, color: 'text-[#009ce1]', bg: 'bg-[#009ce1]/10' },
                  { title: 'Program Aktif', value: String(data?.summary?.activePrograms || 0), color: 'text-sky-600', bg: 'bg-sky-50' },
                  { title: 'Rata-rata', value: data?.summary?.totalValidPayments > 0 ? `Rp ${formatCurrency(Math.round(data.summary.totalRevenue / data.summary.totalValidPayments))}` : 'Rp 0', color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-fb-gray/30 border border-fb-gray-light/60 rounded-sm p-4 hover:shadow-sm transition-all">
                    <p className={`text-lg font-bold ${stat.color} tracking-tight`}>{stat.value}</p>
                    <p className="text-[10px] font-medium text-fb-gray-dark mt-1">{stat.title}</p>
                  </div>
                ))}
              </div>

              {/* Recent Payments Table */}
              <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#009ce1]/10 flex items-center justify-between bg-fb-gray/30">
                  <h3 className="text-xs font-semibold text-fb-blue">Pembayaran Terbaru</h3>
                  <span className="text-[10px] text-fb-gray-dark font-medium">{data?.recentPayments?.length || 0} data</span>
                </div>
                <div className="overflow-x-auto">
                  {data?.recentPayments?.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#009ce1]/10 text-fb-gray-dark bg-fb-gray/20">
                          <th className="text-left font-semibold px-5 py-3">Tanggal</th>
                          <th className="text-left font-semibold px-5 py-3">Kandidat</th>
                          <th className="text-left font-semibold px-5 py-3">Program</th>
                          <th className="text-right font-semibold px-5 py-3">Jumlah</th>
                          <th className="text-center font-semibold px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#009ce1]/10">
                        {data.recentPayments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-fb-gray/30 transition-colors">
                            <td className="px-5 py-3 text-fb-gray-dark whitespace-nowrap">{formatDateTime(p.date)}</td>
                            <td className="px-5 py-3 font-medium text-fb-blue whitespace-nowrap">{p.candidateName}</td>
                            <td className="px-5 py-3 text-fb-gray-dark whitespace-nowrap">{p.programName}</td>
                            <td className="px-5 py-3 text-right font-medium text-fb-blue whitespace-nowrap">Rp {formatCurrency(p.amount)}</td>
                            <td className="px-5 py-3 text-center whitespace-nowrap">
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[10px] font-semibold border"
                                style={{
                                  backgroundColor: `${STATUS_COLORS[p.status]}0A`,
                                  color: STATUS_COLORS[p.status],
                                  borderColor: `${STATUS_COLORS[p.status]}30`
                                }}
                              >
                                {p.status === 'VALID' ? <CheckCircle className="h-3 w-3" /> :
                                 p.status === 'MENUNGGU_VERIFIKASI' ? <Clock className="h-3 w-3" /> :
                                 p.status === 'DITOLAK' ? <XCircle className="h-3 w-3" /> :
                                 <Clock className="h-3 w-3" />}
                                {STATUS_LABELS[p.status] || p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-xs text-fb-gray-dark">Belum ada data pembayaran</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
