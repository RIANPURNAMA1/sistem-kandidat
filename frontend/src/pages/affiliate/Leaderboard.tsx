import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, TrendingUp, Users, CreditCard, DollarSign } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import api from '@/services/api'

export default function AffiliateLeaderboardPage() {
  const [sortBy, setSortBy] = useState('totalRegistrations')
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
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Leaderboard Affiliate</h1>
        <p className="text-muted-foreground">Ranking affiliate berdasarkan jumlah kandidat yang berhasil diajak</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-8 bg-white p-1 rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
        {sorts.map(s => (
          <button key={s.key} onClick={() => setSortBy(s.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === s.key ? 'bg-fb-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
            <s.icon className="h-3.5 w-3.5" />{s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xl bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <th className="px-6 py-4 text-center border border-slate-200 w-20">Rank</th>
              <th className="px-6 py-4 text-left border border-slate-200">Affiliate</th>
              <th className="px-6 py-4 text-center border border-slate-200">Klik</th>
              <th className="px-6 py-4 text-center border border-slate-200">Kandidat</th>
              <th className="px-6 py-4 text-center border border-slate-200">Paid</th>
              <th className="px-6 py-4 text-right border border-slate-200">Total Komisi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(10)].map((_,i) => (
              <tr key={i} className="animate-pulse">
                {[...Array(6)].map((_,j) => <td key={j} className="px-6 py-4 border border-slate-200"><div className="h-4 bg-slate-100 rounded w-full" /></td>)}
              </tr>
            ))}
            {data?.map((a: any, idx: number) => (
              <tr key={a.code} className={cn(
                "hover:bg-slate-50 transition-colors",
                idx === 0 ? 'bg-yellow-50/30' : idx === 1 ? 'bg-slate-50/30' : idx === 2 ? 'bg-orange-50/30' : ''
              )}>
                <td className="px-6 py-4 text-center border border-slate-200">
                  {idx < 3 ? (
                    <div className={cn(
                      "inline-flex items-center justify-center h-8 w-8 rounded-full font-black shadow-sm",
                      idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-slate-300 text-white" : "bg-orange-400 text-white"
                    )}>
                      {idx + 1}
                    </div>
                  ) : (
                    <span className="font-bold text-slate-400">#{idx + 1}</span>
                  )}
                </td>
                <td className="px-6 py-4 border border-slate-200">
                  <div className="font-semibold text-slate-900 text-sm">{a.name || a.email || a.code}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{a.code}</div>
                </td>
                <td className="px-6 py-4 text-center border border-slate-200 font-medium text-slate-600">{a.totalClicks.toLocaleString()}</td>
                <td className="px-6 py-4 text-center border border-slate-200 font-medium text-slate-600">{a.totalRegistrations.toLocaleString()}</td>
                <td className="px-6 py-4 text-center border border-slate-200 font-medium text-slate-600">{a.totalPaid.toLocaleString()}</td>
                <td className="px-6 py-4 text-right border border-slate-200">
                  <span className="font-black text-emerald-600 text-base">{formatCurrency(a.totalCommission)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
