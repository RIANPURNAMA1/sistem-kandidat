import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, BookOpen, TrendingUp, DollarSign, Clock,
  CheckCircle, Award, Copy, ExternalLink, UserPlus, Calendar,
  Search, ArrowUpRight, Activity, GraduationCap,
  ShieldCheck, AlertTriangle, LogIn, UserCheck, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui'
import { formatCurrency, formatDateTime, getStatusLabel } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import FinancialReportModal from '@/components/FinancialReportModal'

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: '#10B981', INTERVIEW: '#3B82F6', REVIEW: '#F59E0B',
  WAITING_PAYMENT: '#F97316', REJECTED: '#EF4444', SUBMITTED: '#6366F1',
  TRAINING: '#8B5CF6', PLACED: '#0EA5E9', COMPLETED: '#14B8A6',
}

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: 'Diterima', INTERVIEW: 'Wawancara', REVIEW: 'Review',
  WAITING_PAYMENT: 'Menunggu Pembayaran', REJECTED: 'Ditolak', SUBMITTED: 'Diajukan',
  TRAINING: 'Pelatihan', PLACED: 'Ditempatkan', COMPLETED: 'Selesai',
}

const PAYMENT_COLORS: Record<string, string> = {
  VALID: '#10B981', MENUNGGU_VERIFIKASI: '#F59E0B',
  MENUNGGU_UPLOAD: '#3B82F6', DITOLAK: '#EF4444',
}

const PAYMENT_LABELS: Record<string, string> = {
  VALID: 'Valid', MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi',
  MENUNGGU_UPLOAD: 'Menunggu Upload', DITOLAK: 'Ditolak',
}

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#009ce1]/20 rounded-sm shadow-sm p-3 text-xs">
      <p className="font-semibold text-fb-blue mb-2 pb-1 border-b border-[#009ce1]/10">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <span className="text-fb-gray-dark flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              {p.name}
            </span>
            <span className="font-medium text-fb-blue">
              {formatter ? formatter(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const kpiItems = [
  { key: 'totalCandidates', label: 'Total Kandidat', icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', textColor: 'text-blue-600' },
  { key: 'totalAffiliates', label: 'Total Affiliate', icon: TrendingUp, color: 'from-[#009ce1] to-[#007bc4]', bg: 'bg-[#009ce1]/10', textColor: 'text-[#009ce1]' },
  { key: 'totalRevenue', label: 'Total Pendapatan', icon: DollarSign, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', textColor: 'text-emerald-600', isCurrency: true },
  { key: 'pendingPayments', label: 'Menunggu Verif', icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', textColor: 'text-amber-600' },
  { key: 'totalPrograms', label: 'Program Aktif', icon: BookOpen, color: 'from-sky-500 to-sky-600', bg: 'bg-sky-50', textColor: 'text-sky-600' },
  { key: 'totalPayments', label: 'Pembayaran Valid', icon: CheckCircle, color: 'from-green-500 to-green-600', bg: 'bg-green-50', textColor: 'text-green-600' },
  { key: 'totalCommission', label: 'Total Komisi', icon: Award, color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', textColor: 'text-rose-600', isCurrency: true },
  { key: 'actionNeeded', label: 'Perlu Tindakan', icon: Activity, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', textColor: 'text-orange-600' },
]

export default function AdminDashboard() {
  const [period, setPeriod] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [reportOpen, setReportOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', period, customStart, customEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ period })
      if (period === 'custom' && customStart) params.set('startDate', customStart)
      if (period === 'custom' && customEnd) params.set('endDate', customEnd)
      const { data } = await api.get(`/dashboard/admin?${params}`)
      return data.data
    },
  })

  const { data: formsData } = useQuery({
    queryKey: ['form-settings'],
    queryFn: async () => {
      const { data } = await api.get('/checkout')
      return data.data || []
    },
  })
  const registerForm = formsData?.find((f: any) => f.formType === 'REGISTER' && f.isActive)
  if (isLoading) return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="h-8 w-48 bg-fb-gray-light rounded-sm" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 bg-fb-gray-light rounded-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-fb-gray-light rounded-sm" />
        <div className="h-72 bg-fb-gray-light rounded-sm" />
      </div>
    </div>
  )

  const kpi = data?.kpi || {}

  const KpiCard = ({ item, value, delay }: { item: typeof kpiItems[0], value: any, delay: number }) => {
    const displayValue = item.isCurrency ? formatCurrency(value || 0) : value?.toLocaleString() || '0'
    return (
      <div className="bg-white border border-[#009ce1]/20 rounded-sm p-5 hover:shadow-md hover:border-[#009ce1]/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both" style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-center justify-between mb-3">
          <div className={`h-10 w-10 rounded-sm ${item.bg} flex items-center justify-center`}>
            <item.icon className={`h-5 w-5 ${item.textColor}`} />
          </div>
          <span className="flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> +2%
          </span>
        </div>
        <p className="text-xs text-fb-gray-dark font-medium mb-1">{item.label}</p>
        <p className="text-xl font-bold text-fb-blue tracking-tight">{displayValue}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
        <div>
          <h1 className="text-lg font-bold text-fb-blue tracking-tight">Dashboard</h1>
          <p className="text-sm text-fb-gray-dark mt-0.5">Overview sistem pendaftaran Mendunia.ID</p>
        </div>
        {data?.isDemo && (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-sm text-xs font-medium">
            Mode Simulasi
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-2">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs"
            onClick={() => setPeriod('week')}
          >
            7 Hari
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs"
            onClick={() => setPeriod('month')}
          >
            30 Hari
          </Button>
          <Button
            variant={period === 'custom' ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs"
            onClick={() => setPeriod('custom')}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Kustom
          </Button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 rounded-sm border-[#009ce1]/30 text-[#009ce1] hover:bg-[#009ce1]/5"
            onClick={() => setReportOpen(true)}
          >
            <FileText className="h-3.5 w-3.5" />
            Laporan
          </Button>
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-9 w-40 text-xs" />
            <span className="text-fb-gray-dark text-xs">—</span>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-9 w-40 text-xs" />
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#009ce1]/20 rounded-sm hover:shadow-md hover:border-[#009ce1]/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm bg-fb-blue-light flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-fb-blue" />
            </div>
            <span className="text-xs text-fb-gray-dark truncate max-w-[200px]">
              {registerForm ? `${window.location.origin}/checkout/${registerForm.slug}` : '/register'}
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-fb-blue font-medium" onClick={() => {
            const url = registerForm ? `${window.location.origin}/checkout/${registerForm.slug}` : `${window.location.origin}/register`
            navigator.clipboard.writeText(url); toast({ title: 'Link disalin!' })
          }}>
            <Copy className="h-3 w-3 mr-1" /> Salin
          </Button>
        </div>
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#009ce1]/20 rounded-sm hover:shadow-md hover:border-[#009ce1]/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-sm bg-fb-blue-light flex items-center justify-center">
              <ExternalLink className="h-4 w-4 text-fb-blue" />
            </div>
            <span className="text-xs text-fb-gray-dark truncate max-w-[200px]">
              {`${window.location.origin}/register/affiliate`}
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-fb-blue font-medium" onClick={() => {
            const url = `${window.location.origin}/register/affiliate`
            navigator.clipboard.writeText(url); toast({ title: 'Link affiliate disalin!' })
          }}>
            <Copy className="h-3 w-3 mr-1" /> Salin
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.slice(0, 4).map((item, i) => (
          <KpiCard key={item.key} item={item} value={kpi[item.key]} delay={100 + i * 80} />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.slice(4).map((item, i) => (
          <KpiCard key={item.key} item={item} value={kpi[item.key]} delay={100 + (i + 4) * 80} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '500ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fb-blue">Tren Pendaftaran</h3>
            <div className="flex items-center gap-3 text-xs text-fb-gray-dark">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Kandidat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#009ce1]" />
                Affiliate
              </span>
            </div>
          </div>
          <div className="h-[300px] p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyStats} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EB" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#65676B' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#65676B' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E4E6EB', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area name="Kandidat" type="monotone" dataKey="candidates" stroke="#3B82F6" strokeWidth={2} fill="url(#colorCand)" activeDot={{ r: 4, fill: '#3B82F6' }} />
                <Area name="Affiliate" type="monotone" dataKey="affiliates" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorAff)" activeDot={{ r: 4, fill: '#8B5CF6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '600ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10">
            <h3 className="text-sm font-semibold text-fb-blue">Distribusi Status</h3>
          </div>
          <div className="p-5">
            {data?.statusStats?.length ? (
              <>
                <div className="h-44 w-full relative mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusStats} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                        paddingAngle={3} dataKey="count" stroke="none"
                      >
                        {data.statusStats.map((e: any) => (
                          <Cell key={e.status} fill={STATUS_COLORS[e.status] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EB', fontSize: '12px', boxShadow: 'none' }}
                        formatter={(value: number, _name: string, props: any) => [value, STATUS_LABELS[props.payload.status] || props.payload.status]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-fb-blue">
                      {data.statusStats.reduce((s: number, c: any) => s + c.count, 0)}
                    </span>
                    <span className="text-[10px] text-fb-gray-dark">Total</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {data.statusStats.slice(0, 5).map((e: any) => (
                    <div key={e.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[e.status] || '#94A3B8' }} />
                        <span className="text-fb-gray-dark">{STATUS_LABELS[e.status] || e.status}</span>
                      </div>
                      <span className="font-semibold text-fb-blue">{e.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-fb-gray-dark">Belum ada data status</div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue vs Commission + Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Commission Chart */}
        <div className="lg:col-span-2 bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '650ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fb-blue">Pendapatan vs Komisi</h3>
            <div className="flex items-center gap-3 text-xs text-fb-gray-dark">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Pendapatan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Komisi
              </span>
            </div>
          </div>
          <div className="h-[300px] p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthlyStats} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EB" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#65676B' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#65676B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />} cursor={{ fill: '#E4E6EB', opacity: 0.3 }} />
                <Bar name="Pendapatan" dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar name="Komisi" dataKey="commission" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Distribution */}
        <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '700ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10">
            <h3 className="text-sm font-semibold text-fb-blue">Status Pembayaran</h3>
          </div>
          <div className="p-5">
            {data?.paymentStatusStats?.length ? (
              <>
                <div className="h-40 w-full relative mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.paymentStatusStats} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                        paddingAngle={3} dataKey="count" stroke="none"
                      >
                        {data.paymentStatusStats.map((e: any) => (
                          <Cell key={e.status} fill={PAYMENT_COLORS[e.status] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E4E6EB', fontSize: '12px', boxShadow: 'none' }}
                        formatter={(value: number, _: string, props: any) => [value, PAYMENT_LABELS[props.payload.status] || props.payload.status]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.paymentStatusStats.map((e: any) => (
                    <div key={e.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PAYMENT_COLORS[e.status] || '#94A3B8' }} />
                        <span className="text-fb-gray-dark">{PAYMENT_LABELS[e.status] || e.status}</span>
                      </div>
                      <span className="font-semibold text-fb-blue">{e.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-fb-gray-dark">Belum ada data pembayaran</div>
            )}
          </div>
        </div>
      </div>

      {/* Demographics + Document Status + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gender Distribution */}
        <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '750ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10">
            <h3 className="text-sm font-semibold text-fb-blue flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-fb-gray-dark" />
              Jenis Kelamin
            </h3>
          </div>
          <div className="p-5">
            {data?.genderStats?.length ? (
              <>
                <div className="h-36 w-full relative mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.genderStats} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                        paddingAngle={3} dataKey="count" stroke="none"
                      >
                        {data.genderStats.map((e: any) => (
                          <Cell key={e.gender} fill={e.gender === 'LAKI_LAKI' ? '#3B82F6' : '#EC4899'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {data.genderStats.map((e: any) => (
                    <div key={e.gender} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.gender === 'LAKI_LAKI' ? '#3B82F6' : '#EC4899' }} />
                        <span className="text-fb-gray-dark">{e.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</span>
                      </div>
                      <span className="font-semibold text-fb-blue">{e.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-fb-gray-dark">Belum ada data</div>
            )}
          </div>
        </div>

        {/* Education Distribution */}
        <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '800ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10">
            <h3 className="text-sm font-semibold text-fb-blue flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-fb-gray-dark" />
              Pendidikan Terakhir
            </h3>
          </div>
          <div className="p-5">
            {data?.educationStats?.length ? (
              <div className="space-y-3">
                {data.educationStats.map((e: any, i: number) => {
                  const total = data.educationStats.reduce((s: number, x: any) => s + x.count, 0);
                  const pct = total ? Math.round((e.count / total) * 100) : 0;
                  return (
                    <div key={e.lastEducation}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-fb-gray-dark">{e.lastEducation}</span>
                        <span className="font-semibold text-fb-blue">{e.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-fb-gray rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'][i % 5],
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-fb-gray-dark">Belum ada data</div>
            )}
          </div>
        </div>

        {/* Document Status + Recent Activity */}
        <div className="space-y-6">
          {/* Document Verification */}
          <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '850ms' }}>
            <div className="px-5 py-4 border-b border-[#009ce1]/10">
              <h3 className="text-sm font-semibold text-fb-blue flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-fb-gray-dark" />
                Verifikasi Dokumen
              </h3>
            </div>
            <div className="p-5">
              {data?.documentStats?.length ? (
                <div className="space-y-3">
                  {data.documentStats.map((d: any) => {
                    const total = data.documentStats.reduce((s: number, x: any) => s + x.count, 0);
                    const pct = total ? Math.round((d.count / total) * 100) : 0;
                    const docColor = d.status === 'VERIFIED' ? '#10B981' : d.status === 'REJECTED' ? '#EF4444' : '#F59E0B';
                    const docLabel = d.status === 'VERIFIED' ? 'Terverifikasi' : d.status === 'REJECTED' ? 'Ditolak' : 'Pending';
                    return (
                      <div key={d.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: docColor }} />
                          <span className="text-fb-gray-dark">{docLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-fb-gray-dark">{pct}%</span>
                          <span className="font-semibold text-fb-blue w-6 text-right">{d.count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-fb-gray-dark">Belum ada data dokumen</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '900ms' }}>
            <div className="px-5 py-4 border-b border-[#009ce1]/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fb-blue flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-fb-gray-dark" />
                Aktivitas Terbaru
              </h3>
            </div>
            <div className="divide-y divide-fb-gray-light/40">
              {data?.recentAuditLogs?.length ? (
                data.recentAuditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-fb-gray/30 transition-colors">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                      log.action === 'UPDATE' ? 'bg-blue-50 text-blue-600' :
                      log.action === 'DELETE' ? 'bg-red-50 text-red-600' :
                      log.action === 'LOGIN' ? 'bg-[#009ce1]/10 text-[#009ce1]' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {log.action === 'LOGIN' ? <LogIn className="h-3.5 w-3.5" /> :
                       log.action === 'CREATE' ? <UserPlus className="h-3.5 w-3.5" /> :
                       log.action === 'DELETE' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                       log.action === 'APPROVE' || log.action === 'REJECT' ? <UserCheck className="h-3.5 w-3.5" /> :
                       <Activity className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-fb-blue truncate">{log.resource}</p>
                      <p className="text-[10px] text-fb-gray-dark">{log.userEmail || 'System'}</p>
                    </div>
                    <span className="text-[10px] text-fb-gray-dark whitespace-nowrap flex-shrink-0">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-fb-gray-dark">Belum ada aktivitas</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Programs & Top Affiliates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Programs */}
        <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '950ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fb-blue">Program Terlaris</h3>
            <span className="text-[10px] text-fb-gray-dark font-medium">Top 10</span>
          </div>
          {data?.topPrograms?.length ? (
            <div className="divide-y divide-fb-gray-light/40">
              {data.topPrograms.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-fb-gray/30 transition-all duration-200 animate-in fade-in slide-in-from-left-2 fill-mode-both" style={{ animationDelay: `${700 + (i + 1) * 60}ms` }}>
                  <span className={`w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                    i === 1 ? 'bg-slate-50 text-slate-600 border border-slate-200/50' :
                    i === 2 ? 'bg-orange-50 text-orange-700 border border-orange-200/50' :
                    'bg-fb-gray text-fb-gray-dark border border-fb-gray-light/50'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-fb-blue truncate">{p.name}</p>
                    <p className="text-[10px] text-fb-gray-dark">{p.totalSales} penjualan</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex-shrink-0">{formatCurrency(p.totalRevenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-fb-gray-dark">Belum ada data penjualan</div>
          )}
        </div>

        {/* Top Affiliates */}
        <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '800ms' }}>
          <div className="px-5 py-4 border-b border-[#009ce1]/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fb-blue">Top Affiliate</h3>
            <span className="text-[10px] text-fb-gray-dark font-medium">Terbaik</span>
          </div>
          {data?.topAffiliates?.length ? (
            <div className="divide-y divide-fb-gray-light/40">
              {data.topAffiliates.map((a: any, i: number) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-fb-gray/30 transition-all duration-200 animate-in fade-in slide-in-from-left-2 fill-mode-both" style={{ animationDelay: `${800 + (i + 1) * 60}ms` }}>
                  <span className={`w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                    i === 1 ? 'bg-slate-50 text-slate-600 border border-slate-200/50' :
                    i === 2 ? 'bg-orange-50 text-orange-700 border border-orange-200/50' :
                    'bg-fb-gray text-fb-gray-dark border border-fb-gray-light/50'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-fb-blue truncate">{a.name}</p>
                    <p className="text-[10px] text-fb-gray-dark">{a.code} · {a.totalCommissions} komisi</p>
                  </div>
                  <span className="text-xs font-bold text-[#009ce1] flex-shrink-0">{formatCurrency(a.totalCommission)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-fb-gray-dark">Belum ada data affiliate</div>
          )}
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="bg-white border border-[#009ce1]/20 rounded-sm overflow-hidden hover:shadow-md hover:border-[#009ce1]/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '900ms' }}>
        <div className="px-5 py-4 border-b border-[#009ce1]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-fb-blue">Pendaftaran Terbaru</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fb-gray-dark" />
              <Input placeholder="Cari..." className="pl-9 h-9 w-48 text-xs rounded-sm" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#009ce1]/10 text-fb-gray-dark text-xs bg-fb-gray/30">
                <th className="px-5 py-3 font-semibold">Kandidat</th>
                <th className="px-5 py-3 font-semibold">Program</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fb-gray-light/40">
              {data?.recentApplications?.map((app: any, i: number) => (
                <tr key={app.id} className="hover:bg-fb-gray/30 transition-colors animate-in fade-in fill-mode-both" style={{ animationDelay: `${900 + (i + 1) * 50}ms` }}>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-sm bg-gradient-to-br from-fb-blue to-fb-blue-dark text-white flex items-center justify-center text-xs font-bold">
                        {(app.candidate?.fullName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-fb-blue text-xs">{app.candidate?.fullName || 'Anonim'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-fb-gray-dark whitespace-nowrap text-xs">
                    {app.program?.name || '—'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium border"
                      style={{
                        backgroundColor: `${STATUS_COLORS[app.status]}0A`,
                        color: STATUS_COLORS[app.status],
                        borderColor: `${STATUS_COLORS[app.status]}30`
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[app.status] }} />
                      {getStatusLabel(app.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-fb-gray-dark text-right whitespace-nowrap text-xs">
                    {formatDateTime(app.submittedAt)}
                  </td>
                </tr>
              ))}
              {!data?.recentApplications?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-xs text-fb-gray-dark">
                    Belum ada pendaftaran terbaru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Report Modal */}
      <FinancialReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  )
}
