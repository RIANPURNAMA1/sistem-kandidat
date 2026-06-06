import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, TrendingUp, Users, CreditCard, DollarSign, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import api from '@/services/api'

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function AffiliateDashboard() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['affiliate-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/affiliate')
      return data.data
    },
  })

  const { data: programsData } = useQuery({
    queryKey: ['affiliate-programs'],
    queryFn: async () => {
      const { data } = await api.get('/affiliates/my/programs')
      return data.data
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (programId: string) => {
      await api.delete(`/affiliates/my/programs/${programId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-programs'] })
      toast({ title: 'Program berhasil dihapus' })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Terjadi kesalahan', variant: 'destructive' })
    },
  })

  const affiliate = data?.affiliate
  const myPrograms = programsData || []

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast({ title: 'Link referral disalin!' })
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard Affiliate</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Pantau performa referral dan komisi Anda</p>
      </div>

      {!affiliate ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <TrendingUp className="h-16 w-16 text-slate-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-900 mb-2">Akun affiliate belum aktif</p>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Hubungi administrator untuk aktivasi akun affiliate Anda agar dapat mulai mereferensikan kandidat.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Total Klik" value={affiliate.totalClicks?.toLocaleString()} color="bg-blue-600" />
            <StatCard icon={Users} label="Total Registrasi" value={affiliate.totalRegistrations?.toLocaleString()} color="bg-emerald-600" />
            <StatCard icon={CreditCard} label="Pembayaran Valid" value={affiliate.totalPaid?.toLocaleString()} color="bg-purple-600" />
            <StatCard icon={DollarSign} label="Total Komisi" value={formatCurrency(affiliate.totalCommission)} color="bg-orange-500" />
          </div>

          {/* Per-Program Links */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-bold text-sm text-slate-900">Program Aktif Saya</h2>
              </div>
              <div className="p-5 flex-1 space-y-3">
                {myPrograms.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8 italic font-medium">Belum ada program aktif.</p>
                ) : (
                  myPrograms.map((program: any) => (
                    <div key={program.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 hover:border-fb-blue/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{program.name}</p>
                          {program.fee && <p className="text-[10px] font-bold text-fb-blue uppercase tracking-widest">{formatCurrency(program.fee)}</p>}
                        </div>
                        <button
                          onClick={() => removeMutation.mutate(program.id)}
                          className="h-8 w-8 rounded-lg hover:bg-red-100 flex items-center justify-center text-slate-400 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 overflow-hidden shadow-inner">
                          <span className="text-[10px] text-slate-400 font-mono">Link:</span>
                          <input
                            readOnly
                            value={program.referralLink || ''}
                            className="bg-transparent text-[11px] font-mono text-slate-600 border-0 outline-none w-full"
                          />
                        </div>
                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => copyLink(program.referralLink)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          {/* Commissions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="font-bold text-sm text-slate-900">Ringkasan Komisi</h2>
            </div>
            {!data?.commissions?.length ? (
              <div className="p-12 text-center text-slate-400 font-medium italic">Belum ada komisi tercatat.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4 text-left border border-slate-200">Status</th>
                      <th className="px-6 py-4 text-center border border-slate-200">Jumlah Transaksi</th>
                      <th className="px-6 py-4 text-right border border-slate-200">Total Komisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((c: any) => (
                      <tr key={c.status} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 border border-slate-200">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(c.status)}`}>
                            {getStatusLabel(c.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center border border-slate-200 font-semibold text-slate-700">{c._count?._all ?? 0}</td>
                        <td className="px-6 py-4 text-right border border-slate-200 font-black text-emerald-600 text-sm">{formatCurrency(c._sum?.amount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent referrals */}
          {data?.recentReferrals?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-bold text-sm text-slate-900">Referral Terbaru</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {data.recentReferrals.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-fb-blue/10 flex items-center justify-center text-fb-blue font-black text-sm border border-fb-blue/20 shadow-sm">
                        {r.fullName[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{r.fullName}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{formatDate(r.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}