import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, TrendingUp, Users, CreditCard, DollarSign, BarChart3, Table2, MousePointerClick, UserCheck, CheckCircle, Medal, Target } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import api from '@/services/api'

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#F97316']
const RANK_BG = ['bg-yellow-400', 'bg-slate-300', 'bg-orange-400']
const BAR_GRADIENTS = [
  'from-amber-400 to-yellow-500',
  'from-slate-300 to-slate-400',
  'from-orange-400 to-orange-500',
  'from-blue-500 to-blue-600',
  'from-[#009ce1] to-[#007bc4]',
  'from-emerald-400 to-emerald-500',
  'from-pink-400 to-pink-500',
  'from-cyan-400 to-cyan-500',
  'from-lime-400 to-lime-500',
  'from-indigo-400 to-indigo-500',
]

function getColor(idx: number) {
  return RANK_COLORS[idx] || '#3B82F6'
}

function getGradient(idx: number) {
  return BAR_GRADIENTS[idx] || BAR_GRADIENTS[idx % BAR_GRADIENTS.length]
}

function formatValue(val: number, key: string) {
  if (key === 'totalCommission') return formatCurrency(val)
  return val?.toLocaleString() || '0'
}

function metricIcon(key: string) {
  switch (key) {
    case 'totalClicks': return MousePointerClick
    case 'totalRegistrations': return UserCheck
    case 'totalPaid': return CheckCircle
    case 'totalCommission': return DollarSign
    default: return Target
  }
}

export default function AffiliateLeaderboardPage() {
  const [sortBy, setSortBy] = useState('totalRegistrations')
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart')
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', sortBy],
    queryFn: async () => { const { data } = await api.get(`/affiliates/leaderboard?sortBy=${sortBy}`); return data.data },
  })
  const sorts = [
    { key: 'totalRegistrations', label: 'Kandidat', icon: Users },
    { key: 'totalCommission', label: 'Komisi', icon: DollarSign },
    { key: 'totalClicks', label: 'Klik', icon: TrendingUp },
    { key: 'totalPaid', label: 'Paid', icon: CreditCard },
  ]

  const top3 = (data || []).slice(0, 3)
  const listData = (data || []).slice(0, 20)
  const sortLabel = sorts.find(s => s.key === sortBy)?.label || 'Kandidat'
  const maxVal = Math.max(...listData.map((a: any) => a[sortBy] || 0), 1)
  const MetricIcon = metricIcon(sortBy)

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-sm bg-yellow-100 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Leaderboard Affiliate</h1>
            <p className="text-xs text-slate-400">Ranking berdasarkan performa affiliate</p>
          </div>
        </div>
        <div className="flex items-center bg-white border border-[#009ce1]/20 rounded-sm p-0.5 shadow-sm">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all',
              viewMode === 'table' ? 'bg-[#009ce1]/10 text-[#009ce1] shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Table2 className="h-3.5 w-3.5" /> Tabel
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all',
              viewMode === 'chart' ? 'bg-[#009ce1]/10 text-[#009ce1] shadow-sm' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Grafik
          </button>
        </div>
      </div>

      {/* Sort Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
            {sorts.map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold border transition-all',
                sortBy === s.key
                  ? 'bg-[#009ce1] text-white border-[#009ce1] shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              )}>
              <s.icon className="h-3 w-3" />{s.label}
            </button>
          ))}
        </div>
        {viewMode === 'chart' && (
          <span className="text-xs text-slate-400 font-medium">
            Diurutkan berdasarkan <span className="font-semibold text-slate-600">{sortLabel}</span>
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="rounded-sm border border-slate-200 bg-white p-8 animate-pulse">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-8 bg-slate-100 rounded" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="flex-1 h-4 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {!isLoading && viewMode === 'table' && (
        <div className="overflow-x-auto rounded-sm border border-[#009ce1]/20 shadow-sm bg-white">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-fb-gray/30 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="px-5 py-3.5 text-center border border-[#009ce1]/10 w-16">Rank</th>
                <th className="px-5 py-3.5 text-left border border-[#009ce1]/10">Affiliate</th>
                <th className="px-5 py-3.5 text-center border border-[#009ce1]/10">Klik</th>
                <th className="px-5 py-3.5 text-center border border-[#009ce1]/10">Kandidat</th>
                <th className="px-5 py-3.5 text-center border border-[#009ce1]/10">Paid</th>
                <th className="px-5 py-3.5 text-right border border-[#009ce1]/10">Total Komisi</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((a: any, idx: number) => (
                <tr key={a.code} className={cn(
                  "hover:bg-fb-gray/30 transition-colors",
                  idx === 0 ? 'bg-yellow-50/20' : idx === 1 ? 'bg-slate-50/20' : idx === 2 ? 'bg-orange-50/20' : ''
                )}>
                  <td className="px-5 py-3.5 text-center border border-[#009ce1]/10">
                    {idx < 3 ? (
                      <div className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded-full font-bold text-[10px] shadow-sm",
                        RANK_BG[idx], "text-white"
                      )}>
                        {idx + 1}
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-400 text-[10px]">#{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 border border-[#009ce1]/10">
                    <div className="font-semibold text-slate-900">{a.name || a.email || a.code}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{a.code}</div>
                  </td>
                  <td className="px-5 py-3.5 text-center border border-[#009ce1]/10 font-medium text-slate-600">{a.totalClicks?.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center border border-[#009ce1]/10 font-medium text-slate-600">{a.totalRegistrations?.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center border border-[#009ce1]/10 font-medium text-slate-600">{a.totalPaid?.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right border border-[#009ce1]/10">
                    <span className="font-bold text-emerald-600">{formatCurrency(a.totalCommission)}</span>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-xs text-slate-400">Belum ada data leaderboard.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CHART VIEW ── */}
      {!isLoading && viewMode === 'chart' && (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {top3.map((a: any, idx: number) => (
                <div key={a.code} className={cn(
                  "relative rounded-sm border-2 p-5 bg-white overflow-hidden",
                    idx === 0 ? 'border-yellow-300 shadow-lg shadow-yellow-100' :
                    idx === 1 ? 'border-[#009ce1]/30 shadow-md' :
                    'border-orange-200 shadow-md'
                )}>
                  {/* Decorative top bar */}
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    idx === 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                    idx === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400' :
                    'bg-gradient-to-r from-orange-400 to-orange-500'
                  )} />
                  {/* Rank badge */}
                  <div className={cn(
                    "absolute -top-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center shadow-lg",
                    RANK_BG[idx]
                  )}>
                    <Medal className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shadow-md",
                      RANK_BG[idx], "text-white"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{a.name || a.email || a.code}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{a.code}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-black",
                        idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-500' : 'text-orange-500'
                      )}>
                        {formatValue(a[sortBy], sortBy)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{sortLabel}</p>
                    </div>
                  </div>
                  {/* Mini stats row */}
                  <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-[#009ce1]/10">
                    {sorts.filter(s => s.key !== sortBy).map(s => (
                      <div key={s.key} className="text-center">
                        <s.icon className="h-3 w-3 mx-auto mb-0.5 text-slate-400" />
                        <p className="text-[10px] font-bold text-slate-700">{formatValue(a[s.key], s.key)}</p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Ranking Bars */}
          {listData.length > 0 && (
            <div className="rounded-sm border border-[#009ce1]/20 shadow-sm bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#009ce1]/10 bg-fb-gray/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MetricIcon className="h-3.5 w-3.5 text-[#009ce1]" />
                  <span className="text-xs font-bold text-slate-700">Peringkat Lengkap — {sortLabel}</span>
                </div>
                <span className="text-[10px] text-slate-400">{listData.length} affiliate</span>
              </div>
              <div className="p-4 space-y-1.5">
                {listData.map((a: any, idx: number) => {
                  const pct = maxVal > 0 ? ((a[sortBy] || 0) / maxVal) * 100 : 0
                  return (
                    <div key={a.code} className="group flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-slate-50 transition-colors">
                      {/* Rank */}
                      <div className="w-7 flex-shrink-0 text-center">
                        {idx < 3 ? (
                          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-sm mx-auto", RANK_BG[idx])}>
                            {idx + 1}
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">#{idx + 1}</span>
                        )}
                      </div>
                      {/* Name */}
                      <div className="w-28 sm:w-36 flex-shrink-0 truncate">
                        <p className="text-xs font-semibold text-slate-800 truncate">{a.name || a.email || a.code}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">{a.code}</p>
                      </div>
                      {/* Bar */}
                      <div className="flex-1 min-w-0">
                        <div className="h-6 w-full bg-slate-100 rounded-sm overflow-hidden relative">
                          <div
                            className={cn("h-full rounded-sm bg-gradient-to-r transition-all duration-500", getGradient(idx))}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                      {/* Value */}
                      <div className="w-20 sm:w-28 text-right flex-shrink-0">
                        <p className="text-xs font-bold" style={{ color: getColor(idx) }}>
                          {formatValue(a[sortBy], sortBy)}
                        </p>
                      </div>
                      {/* Hover stats */}
                      <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <div className="w-px h-4 bg-slate-200" />
                        {sorts.filter(s => s.key !== sortBy).map(s => (
                          <span key={s.key} className="text-[9px] text-slate-400 whitespace-nowrap">
                            <s.icon className="h-2.5 w-2.5 inline mr-0.5" />
                            {formatValue(a[s.key], s.key)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {listData.length === 0 && (
            <div className="rounded-sm border border-slate-200 bg-white p-14 text-center">
              <Trophy className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-xs text-slate-400">Belum ada data leaderboard.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
