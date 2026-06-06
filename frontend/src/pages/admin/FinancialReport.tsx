import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  DollarSign, CreditCard, Award,
  Download, FileText, BarChart3, CheckCircle, Clock,
  XCircle, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import api from '@/services/api'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

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

const COMMISSION_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#3B82F6',
  PAID: '#10B981',
  REJECTED: '#EF4444',
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-card rounded-sm border border-border/60 p-4 flex flex-col gap-3 shadow-sm hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className={`h-8 w-8 rounded-sm flex items-center justify-center ${color} bg-opacity-10`}>
          <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{title}</p>
      </div>
    </div>
  )
}

export default function FinancialReport() {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Laporan Keuangan</h1>
          <p className="text-sm text-muted-foreground">Rekap pembayaran, pendapatan, dan komisi</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="h-8 rounded border border-border/60 bg-transparent px-2 text-xs outline-none focus:border-primary"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="h-8 rounded border border-border/60 bg-transparent px-2 text-xs outline-none focus:border-primary"
          />
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Pendapatan" value={`Rp ${formatCurrency(data?.summary?.totalRevenue || 0)}`} icon={DollarSign} color="bg-emerald-500" />
        <StatCard title="Pembayaran Valid" value={String(data?.summary?.totalValidPayments || 0)} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Total Pembayaran" value={String(data?.summary?.totalPayments || 0)} icon={CreditCard} color="bg-blue-500" />
        <StatCard title="Total Komisi" value={`Rp ${formatCurrency(data?.summary?.totalCommissionAmount || 0)}`} icon={Award} color="bg-purple-500" />
        <StatCard title="Program Aktif" value={String(data?.summary?.activePrograms || 0)} icon={FileText} color="bg-indigo-500" />
        <StatCard title="Rata-rata per Bayar" value={data?.summary?.totalValidPayments > 0 ? `Rp ${formatCurrency(Math.round(data.summary.totalRevenue / data.summary.totalValidPayments))}` : 'Rp 0'} icon={BarChart3} color="bg-amber-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Program */}
        <Card className="rounded-sm border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pendapatan per Program</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.revenueByProgram?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByProgram} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="programName" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip formatter={(v: number) => `Rp ${formatCurrency(v)}`} />
                    <Bar dataKey="total" fill="#6366F1" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card className="rounded-sm border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribusi Status Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.paymentsByStatus?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status, count }) => `${STATUS_LABELS[status] || status}: ${count}`}
                    >
                      {data.paymentsByStatus.map((entry: any) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v, STATUS_LABELS[name] || name]} />
                    <Legend formatter={(value: string) => STATUS_LABELS[value] || value} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue & Commission Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <Card className="rounded-sm border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pendapatan Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.monthlyRevenue?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyRevenue} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number, name: string) => [name === 'total' ? `Rp ${formatCurrency(v)}` : v, name === 'total' ? 'Pendapatan' : 'Jumlah']} />
                    <Bar dataKey="total" fill="#10B981" radius={[3, 3, 0, 0]} name="total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Commission Status */}
        <Card className="rounded-sm border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status Komisi</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.commissionsByStatus?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.commissionsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {data.commissionsByStatus.map((entry: any) => (
                        <Cell key={entry.status} fill={COMMISSION_COLORS[entry.status] || '#999'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card className="rounded-sm border-border/60 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Pembayaran Terbaru</CardTitle>
          <span className="text-[10px] text-muted-foreground">{data?.recentPayments?.length || 0} data</span>
        </CardHeader>
        <CardContent className="p-0">
          {data?.recentPayments?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Tanggal</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Kandidat</th>
                    <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Program</th>
                    <th className="text-right font-semibold text-muted-foreground px-4 py-2.5">Jumlah</th>
                    <th className="text-center font-semibold text-muted-foreground px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(p.date)}</td>
                      <td className="px-4 py-2.5 font-medium">{p.candidateName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.programName}</td>
                      <td className="px-4 py-2.5 text-right font-medium">Rp {formatCurrency(p.amount)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.status === 'VALID' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'MENUNGGU_VERIFIKASI' ? 'bg-amber-100 text-amber-700' :
                          p.status === 'DITOLAK' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data pembayaran</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
