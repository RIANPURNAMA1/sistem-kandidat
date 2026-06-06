import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, BookOpen, CreditCard, TrendingUp, DollarSign, Clock, 
  CheckCircle, Award, Copy, ExternalLink, Info, UserPlus, Calendar,
  ChevronDown, Search, ArrowUpRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, 
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

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

// Tooltip Chart bergaya Clean
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-lg shadow-sm p-3 text-xs">
      <p className="font-semibold text-foreground mb-2 pb-1 border-b border-border">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
              {p.name}
            </span>
            <span className="font-medium text-foreground">
              {formatter ? formatter(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

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

  // Skeleton bergaya Repliq
  if (isLoading) return (
    <div className="space-y-6 pb-8 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-md" />
      <div className="h-10 w-full bg-muted/50 rounded-sm" />
      <div className="h-40 w-full bg-muted/40 rounded-sm border border-border" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[300px] bg-muted/30 rounded-sm border border-border" />
        <div className="h-[300px] bg-muted/30 rounded-sm border border-border" />
      </div>
    </div>
  )

  const kpi = data?.kpi || {}

  // Komponen KPI Internal bergaya list tabel
  const KPICell = ({ title, value, icon: Icon }: any) => (
    <div className="p-4 sm:p-5 flex flex-col justify-between group">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-sm font-bold text-foreground">{value}</span>
        {/* Fake trend badge matching Repliq design */}
        <span className="flex items-center text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700">
          <ArrowUpRight className="h-3 w-3 mr-0.5" /> 2%
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-8 font-sans">
      
      {/* 1. Header (Mirip "Welcome back, Omar") */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground tracking-tight">Dashboard Overview</h1>
          {data?.isDemo && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-xs font-medium flex items-center gap-1">
              <Info className="h-3 w-3" /> Simulasi
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Everything you need to monitor registrations, affiliates, and revenue.
        </p>
      </div>

      {/* 2. Top Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Period Selectors as Repliq Dropdowns */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <Button variant="outline" size="sm" className="h-9 text-muted-foreground font-normal border-border bg-transparent shadow-none" onClick={() => setPeriod(period === 'week' ? 'month' : 'week')}>
            {period === 'week' ? 'Last 7 days' : 'Last 30 days'} <ChevronDown className="ml-2 h-3.5 w-3.5" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className={`h-9 font-normal border-border bg-transparent shadow-none ${period === 'custom' ? 'text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setPeriod('custom')}
          >
            <Calendar className="mr-2 h-3.5 w-3.5" /> 
            {period === 'custom' && customStart && customEnd ? `${customStart} — ${customEnd}` : 'Custom Range'} 
            <ChevronDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-9 w-auto text-xs shadow-none border-border" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-9 w-auto text-xs shadow-none border-border" />
          </div>
        )}
      </div>

      {/* Quick Links Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 border border-border rounded-sm bg-background shadow-sm">
          <div className="flex items-center gap-3">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-xs">{window.location.origin}/register</span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register`); toast({ title: 'Link disalin!' })}}>
            <Copy className="h-3 w-3 mr-1" /> Copy
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 border border-border rounded-sm bg-background shadow-sm">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-xs">{window.location.origin}/register/affiliate</span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register/affiliate`); toast({ title: 'Link affiliate disalin!' })}}>
            <Copy className="h-3 w-3 mr-1" /> Copy
          </Button>
        </div>
      </div>

      {/* 3. Main KPI Unified Board (Matching the Repliq Top Section) */}
      <div className="border border-border rounded-sm bg-background shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Row 1 */}
          <KPICell title="Total Kandidat" value={kpi.totalCandidates?.toLocaleString() || '0'} icon={Users} />
          <KPICell title="Total Affiliate" value={kpi.totalAffiliates?.toLocaleString() || '0'} icon={TrendingUp} />
          <KPICell title="Total Pendapatan" value={formatCurrency(kpi.totalRevenue || 0)} icon={DollarSign} />
          <KPICell title="Menunggu Verif" value={kpi.pendingPayments?.toLocaleString() || '0'} icon={Clock} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-border divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Row 2 */}
          <KPICell title="Program Aktif" value={kpi.totalPrograms?.toLocaleString() || '0'} icon={BookOpen} />
          <KPICell title="Pembayaran Valid" value={kpi.totalPayments?.toLocaleString() || '0'} icon={CheckCircle} />
          <KPICell title="Total Komisi" value={formatCurrency(kpi.totalCommission || 0)} icon={Award} />
          <KPICell title="Perlu Tindakan" value={kpi.pendingPayments?.toLocaleString() || '0'} icon={CreditCard} />
        </div>
      </div>

      {/* 4. Charts Area (Redesigned for clean look) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Area Chart */}
        <div className="lg:col-span-2 border border-border rounded-sm bg-background shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Tren Pendaftaran</h3>
          </div>
          <div className="h-[280px] p-5 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyStats} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area name="Kandidat" type="monotone" dataKey="candidates" stroke="#3B82F6" strokeWidth={2} fill="url(#colorCand)" activeDot={{ r: 4 }} />
                <Area name="Affiliate" type="monotone" dataKey="affiliates" stroke="#8B5CF6" strokeWidth={2} fill="transparent" activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="border border-border rounded-sm bg-background shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold text-foreground">Distribusi Status</h3>
          </div>
          <div className="flex-1 p-5 flex flex-col justify-center">
            {data?.statusStats?.length ? (
              <>
                <div className="h-40 w-full relative mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={data.statusStats} cx="50%" cy="50%" innerRadius={55} outerRadius={75} 
                        paddingAngle={2} dataKey="count" stroke="none"
                      >
                        {data.statusStats.map((e: any) => (
                          <Cell key={e.status} fill={STATUS_COLORS[e.status] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px', boxShadow: 'none' }}
                        formatter={(value: number, name: string, props: any) => [value, STATUS_LABELS[props.payload.status] || props.payload.status]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-foreground">
                      {data.statusStats.reduce((s: number, c: any) => s + c.count, 0)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {data.statusStats.slice(0, 4).map((e: any) => (
                    <div key={e.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[e.status] || '#94A3B8' }} />
                        <span className="text-muted-foreground truncate">{STATUS_LABELS[e.status] || e.status}</span>
                      </div>
                      <span className="font-medium text-foreground">{e.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground text-xs pb-4">Belum ada data status</div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Top Programs & Top Affiliates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Programs */}
        <div className="border border-border rounded-sm bg-background shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Top 10 Program Terlaris</h3>
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {data?.topPrograms?.length ? (
            <div className="divide-y divide-border">
              {data.topPrograms.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.totalSales} penjualan</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex-shrink-0">{formatCurrency(p.totalRevenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">Belum ada data penjualan</div>
          )}
        </div>

        {/* Top Affiliates */}
        <div className="border border-border rounded-sm bg-background shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Top Affiliate</h3>
            <Award className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {data?.topAffiliates?.length ? (
            <div className="divide-y divide-border">
              {data.topAffiliates.map((a: any, i: number) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.code} · {a.totalCommissions} komisi</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 flex-shrink-0">{formatCurrency(a.totalCommission)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">Belum ada data affiliate</div>
          )}
        </div>
      </div>

      {/* 6. Recent Table (Exactly matching "Recent messages" design) */}
      <div className="border border-border rounded-sm bg-background shadow-sm overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border bg-background">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search registrations..." className="pl-9 h-9 rounded-md border-border shadow-none bg-transparent" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 text-muted-foreground font-normal border-border bg-transparent">
              Status <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-muted-foreground font-normal border-border bg-transparent">
              Programs <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs bg-background">
                <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                <th className="px-4 py-3 font-medium">Kandidat</th>
                <th className="px-4 py-3 font-medium">Program</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {data?.recentApplications?.map((app: any, idx: number) => (
                <tr key={app.id} className="hover:bg-muted/40 transition-colors group">
                  <td className="px-4 py-3 text-center text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {(app.candidate?.fullName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground text-xs">{app.candidate?.fullName || 'Anonim'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {app.program?.name || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* Outline style badge matching Repliq */}
                    <span 
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border"
                      style={{ 
                        backgroundColor: `${STATUS_COLORS[app.status]}0A`, // 0A is very light hex opacity
                        color: STATUS_COLORS[app.status],
                        borderColor: `${STATUS_COLORS[app.status]}40` 
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[app.status] }}></span>
                      {getStatusLabel(app.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-right whitespace-nowrap text-xs">
                    {formatDateTime(app.submittedAt)}
                  </td>
                </tr>
              ))}
              {!data?.recentApplications?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                    Belum ada pendaftaran terbaru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}