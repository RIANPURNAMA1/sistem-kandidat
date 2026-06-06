import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Gift, Loader2 } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

interface Reward {
  id: string
  name: string
  description: string
  image?: string
  pointsRequired: number
  stock: number | null
  isActive: boolean
}

interface Redemption {
  id: string
  rewardId: string
  reward: { name: string; image?: string }
  pointsSpent: number
  status: string
  notes?: string
  createdAt: string
}

const statusBadge = (s: string) => {
  if (s === 'APPROVED') return { label: 'Disetujui', class: 'bg-green-100 text-green-700' }
  if (s === 'REJECTED') return { label: 'Ditolak', class: 'bg-red-100 text-red-700' }
  return { label: 'Menunggu', class: 'bg-amber-100 text-amber-700' }
}

export default function AffiliateRewardsPage() {
  const queryClient = useQueryClient()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)

  const { data: myData, isLoading: loadingPoints } = useQuery({
    queryKey: ['my-points'],
    queryFn: async () => {
      const { data } = await api.get('/rewards/my-points')
      return data.data as { id: string; points: number; totalPaid: number }
    },
  })

  const { data: rewards, isLoading: loadingRewards } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data } = await api.get('/rewards')
      return data.data as Reward[]
    },
  })

  const { data: redemptions, isLoading: loadingRedemptions } = useQuery({
    queryKey: ['my-redemptions'],
    queryFn: async () => {
      const { data } = await api.get('/rewards/my-redemptions')
      return data.data as Redemption[]
    },
  })

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const { data } = await api.post('/rewards/redeem', { rewardId })
      return data
    },
    onSuccess: () => {
      toast({ title: 'Penukaran berhasil diajukan!' })
      queryClient.invalidateQueries({ queryKey: ['my-points'] })
      queryClient.invalidateQueries({ queryKey: ['my-redemptions'] })
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      setSelectedReward(null)
    },
    onError: (err: any) => toast({ title: 'Gagal menukar', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const activeRewards = rewards?.filter(r => r.isActive) ?? []

  return (
    <div className="space-y-6">
      {/* Points Balance */}
      <Card className="overflow-hidden border-0">
        <div className="bg-[#009ce1] p-5">
          <p className="text-[10px] font-medium text-white/80 uppercase tracking-wider">Saldo Poin Kamu</p>
          <p className="text-4xl font-bold text-white mt-1">
            {loadingPoints ? <Loader2 className="h-8 w-8 animate-spin inline" /> : myData?.points ?? 0}
          </p>
          <p className="text-xs text-white/70 mt-1">
            Dari {myData?.totalPaid ?? 0} referral terbayar
          </p>
        </div>
      </Card>

      {/* Reward Catalog */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 mb-3">Tukarkan Poin</h2>
        {loadingRewards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4 space-y-2"><div className="h-5 bg-slate-100 rounded w-3/4" /><div className="h-4 bg-slate-100 rounded w-full" /></CardContent></Card>
            ))}
          </div>
        ) : activeRewards.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Gift className="h-8 w-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">Belum ada reward tersedia</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRewards.map(r => {
              const canRedeem = (myData?.points ?? 0) >= r.pointsRequired
              return (
                <Card key={r.id} className={`hover:shadow-md transition-shadow ${!canRedeem ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0">
                        <Gift className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold text-indigo-600">{r.pointsRequired} poin</span>
                          {r.stock !== null && <span className="text-[10px] text-slate-400">Sisa {r.stock}</span>}
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-3 h-8 text-xs gap-1.5"
                      disabled={!canRedeem || redeemMutation.isPending}
                      onClick={() => {
                        setSelectedReward(r)
                        redeemMutation.mutate(r.id)
                      }}
                    >
                      {redeemMutation.isPending && selectedReward?.id === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Gift className="h-3.5 w-3.5" />
                      )}
                      Tukar
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Redemption History */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 mb-3">Riwayat Penukaran</h2>
        {loadingRedemptions ? (
          <Card><CardContent className="p-4 space-y-2 animate-pulse"><div className="h-4 bg-slate-100 rounded w-full" /><div className="h-4 bg-slate-100 rounded w-3/4" /></CardContent></Card>
        ) : !redemptions || redemptions.length === 0 ? (
          <Card><CardContent className="p-6 text-center"><p className="text-xs text-slate-400">Belum ada penukaran</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {redemptions.map(r => {
                const badge = statusBadge(r.status)
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Gift className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{r.reward.name}</p>
                        <p className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-indigo-600">-{r.pointsSpent} poin</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badge.class}`}>{badge.label}</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
