import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, Input, Label } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, Gift, Edit2, Trash2, X, Check, Ban, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'
import { formatDateTime } from '@/lib/utils'

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
  affiliateId: string
  rewardId: string
  pointsSpent: number
  status: string
  notes?: string
  createdAt: string
  affiliate: { user: { email: string }; name: string; code: string }
  reward: { name: string; pointsRequired: number }
}

const emptyForm = { name: '', description: '', pointsRequired: '', stock: '' }

export default function AdminRewardsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Reward | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showRedemptions, setShowRedemptions] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const { data } = await api.get('/rewards')
      return data.data as Reward[]
    },
  })

  const { data: redemptions, isLoading: loadingRedemptions } = useQuery({
    queryKey: ['redemptions'],
    queryFn: async () => {
      const { data } = await api.get('/rewards/redemptions')
      return data.data as Redemption[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        name: values.name,
        description: values.description,
        pointsRequired: Number(values.pointsRequired),
        stock: values.stock ? Number(values.stock) : null,
      }
      if (editing) {
        const { data } = await api.put(`/rewards/${editing.id}`, payload)
        return data
      } else {
        const { data } = await api.post('/rewards', payload)
        return data
      }
    },
    onSuccess: () => {
      toast({ title: editing ? 'Reward berhasil diperbarui' : 'Reward berhasil dibuat' })
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
    },
    onError: (err: any) => toast({ title: 'Gagal menyimpan', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/rewards/${id}`)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Reward berhasil dihapus' })
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
    },
    onError: (err: any) => toast({ title: 'Gagal menghapus', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data } = await api.put(`/rewards/redemptions/${id}`, { status, notes })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redemptions'] })
      queryClient.invalidateQueries({ queryKey: ['rewards'] })
      toast({ title: 'Status redemption berhasil diperbarui' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const openEdit = (r: Reward) => {
    setEditing(r)
    setForm({ name: r.name, description: r.description, pointsRequired: String(r.pointsRequired), stock: r.stock !== null ? String(r.stock) : '' })
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const pendingCount = redemptions?.filter(r => r.status === 'PENDING').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Reward</h1>
          <p className="text-xs text-muted-foreground">Kelola reward yang bisa ditukar affiliate dengan poin</p>
        </div>
        <Button className="gap-2 h-9 text-xs font-medium" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Tambah Reward
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-8 bg-muted rounded w-full" />
            <div className="h-8 bg-muted rounded w-full" />
          </CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Gift className="h-6 w-6 text-indigo-500" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Belum ada reward</p>
            <p className="text-xs text-slate-400 mt-1">Buat reward pertama untuk affiliate</p>
            <Button className="mt-4 gap-2 h-9 text-xs font-medium" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Buat Reward
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs bg-muted/30">
                  <th className="px-4 py-3 font-medium w-8 text-center">#</th>
                  <th className="px-4 py-3 font-medium">Nama Reward</th>
                  <th className="px-4 py-3 font-medium">Deskripsi</th>
                  <th className="px-4 py-3 font-medium text-center">Poin</th>
                  <th className="px-4 py-3 font-medium text-center">Stok</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {data.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0">
                          <Gift className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{r.description}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">{r.pointsRequired}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{r.stock !== null ? r.stock : '∞'}</td>
                    <td className="px-4 py-3 text-center">
                      {r.isActive ? (
                        <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600" onClick={() => openEdit(r)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" onClick={() => { if (confirm('Hapus reward ini?')) deleteMutation.mutate(r.id) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pengajuan Penukaran */}
      <Card>
        <button
          onClick={() => setShowRedemptions(!showRedemptions)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-border text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">Pengajuan Penukaran Reward</h3>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pendingCount} pending</span>
            )}
          </div>
          {showRedemptions ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showRedemptions && (
          loadingRedemptions ? (
            <div className="p-6 animate-pulse space-y-3">
              <div className="h-8 bg-muted rounded w-full" />
              <div className="h-8 bg-muted rounded w-full" />
            </div>
          ) : !redemptions || redemptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Belum ada pengajuan penukaran</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs bg-muted/30">
                    <th className="px-4 py-3 font-medium">Affiliate</th>
                    <th className="px-4 py-3 font-medium">Reward</th>
                    <th className="px-4 py-3 font-medium text-center">Poin</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Tanggal</th>
                    <th className="px-4 py-3 font-medium text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {redemptions.map(r => (
                    <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                            {(r.affiliate.name || r.affiliate.user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">{r.affiliate.name || 'Tanpa Nama'}</p>
                            <p className="text-[10px] text-muted-foreground">{r.affiliate.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">{r.reward.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">{r.pointsSpent}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.status === 'PENDING' && <Badge variant="default" className="text-[10px] bg-amber-500 hover:bg-amber-500">Pending</Badge>}
                        {r.status === 'APPROVED' && <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Disetujui</Badge>}
                        {r.status === 'REJECTED' && <Badge variant="destructive" className="text-[10px]">Ditolak</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        {r.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => statusMutation.mutate({ id: r.id, status: 'APPROVED' })}
                              disabled={statusMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => { if (confirm('Tolak pengajuan ini?')) statusMutation.mutate({ id: r.id, status: 'REJECTED' }) }}
                              disabled={statusMutation.isPending}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>

      {/* Slide panel dari kanan */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setModalOpen(false); setEditing(null); setForm(emptyForm) }} />
          <div className="fixed right-0 top-0 w-full max-w-md bg-white shadow-2xl h-screen flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#009ce1] flex items-center justify-center">
                  <Gift className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{editing ? 'Edit Reward' : 'Tambah Reward Baru'}</h2>
                  <p className="text-[10px] text-muted-foreground">Kelola reward untuk affiliate</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); setEditing(null); setForm(emptyForm) }} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Reward</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Voucher Belanja 50rb" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deskripsi</Label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi reward..."
                  rows={4}
                  className="flex w-full rounded-md border border-fb-gray-light bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-blue resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Poin Dibutuhkan</Label>
                  <Input
                    value={form.pointsRequired}
                    onChange={e => setForm(f => ({ ...f, pointsRequired: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stok (kosongi jika unlimited)</Label>
                  <Input
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value.replace(/[^0-9]/g, '') }))}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              <Button variant="outline" className="h-9 text-xs px-4" onClick={() => { setModalOpen(false); setEditing(null); setForm(emptyForm) }}>
                Batal
              </Button>
              <Button className="h-9 text-xs gap-1.5 px-4" onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.pointsRequired || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {editing ? 'Simpan' : 'Buat Reward'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
