import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Power, X, Loader2, Search, ChevronLeft, ChevronRight, SlidersHorizontal, Download, RefreshCw, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/index'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

const emptyForm = {
  code: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
  programId: '', maxUses: '0', minPayment: '0', maxDiscount: '', expiresAt: '',
}

function CouponFormModal({ isOpen, onClose, coupon, programs }: {
  isOpen: boolean
  onClose: () => void
  coupon?: any
  programs: any[]
}) {
  const queryClient = useQueryClient()
  const isEdit = !!coupon
  const [formData, setFormData] = useState(coupon ? {
    code: coupon.code,
    description: coupon.description || '',
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    programId: coupon.programId || '',
    maxUses: String(coupon.maxUses),
    minPayment: String(coupon.minPayment),
    maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
  } : emptyForm)

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => isEdit ? api.put(`/coupons/${coupon.id}`, data) : api.post('/coupons', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast({ title: isEdit ? 'Kupon berhasil diperbarui' : 'Kupon berhasil dibuat' })
      onClose()
    },
    onError: (err: any) => toast({ title: isEdit ? 'Gagal memperbarui kupon' : 'Gagal membuat kupon', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold">{isEdit ? 'Edit Kupon' : 'Tambah Kupon Baru'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutate(formData) }} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Kode Kupon</Label>
            <Input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="CONTOH10" className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Deskripsi kupon (opsional)" className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Tipe Diskon</Label>
              <Select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="text-xs">
                <option value="PERCENTAGE">Persentase (%)</option>
                <option value="FIXED">Nominal Tetap</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nilai Diskon</Label>
              <Input type="number" required value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})}
                placeholder={formData.discountType === 'PERCENTAGE' ? '10 (10%)' : '50000 (Rp)'} className="text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Program (opsional)</Label>
            <Select value={formData.programId} onChange={e => setFormData({...formData, programId: e.target.value})} className="text-xs">
              <option value="">Semua Program</option>
              {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Min. Pembayaran</Label>
              <Input type="number" value={formData.minPayment} onChange={e => setFormData({...formData, minPayment: e.target.value})} placeholder="0" className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Maks. Diskon (opsional)</Label>
              <Input type="number" value={formData.maxDiscount} onChange={e => setFormData({...formData, maxDiscount: e.target.value})} placeholder="Untuk %" className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Maks. Pemakaian</Label>
              <Input type="number" value={formData.maxUses} onChange={e => setFormData({...formData, maxUses: e.target.value})} placeholder="0 = unlimited" className="text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kadaluarsa (opsional)</Label>
              <Input type="date" value={formData.expiresAt} onChange={e => setFormData({...formData, expiresAt: e.target.value})} className="text-xs" />
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
          <Button type="button" variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button className="text-xs" onClick={() => mutate(formData)} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmDialog({ isOpen, onClose, coupon, onConfirm, isPending }: {
  isOpen: boolean
  onClose: () => void
  coupon: any
  onConfirm: () => void
  isPending: boolean
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-2">Konfirmasi</h2>
        <p className="text-xs text-muted-foreground mb-6">
          Yakin ingin menonaktifkan kupon <strong>{coupon?.code}</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="text-xs" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button variant="destructive" className="text-xs" onClick={onConfirm} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : 'Nonaktifkan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null)
  const [showManage, setShowManage] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-coupons', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/coupons?${params}`)
      return data
    },
  })

  const { data: progData } = useQuery({
    queryKey: ['admin-programs-list'],
    queryFn: async () => { const { data } = await api.get('/programs?limit=100'); return data },
  })
  const programs = progData?.data || []

  const { mutate: toggleMutate, isPending: togglePending } = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast({ title: 'Kupon berhasil dinonaktifkan' })
      setDeleteConfirmOpen(false)
    },
    onError: () => toast({ title: 'Gagal menonaktifkan kupon', variant: 'destructive' }),
  })

  const isExpired = (c: any) => c.expiresAt && new Date(c.expiresAt) < new Date()
  const isFull = (c: any) => c.maxUses > 0 && c.usedCount >= c.maxUses

  return (
    <div className="min-h-screen">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">

        {/* ── Toolbar Atas ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-semibold text-slate-800">Kupon Diskon</h2>
            <span className="text-xs text-slate-400">
              {page} of {data?.pagination?.totalPages || 1}
            </span>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <button
                className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <div className="w-px bg-slate-200" />
              <button
                className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                disabled={page >= (data?.pagination?.totalPages || 1)}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="outline" size="sm"
                className="h-9 text-xs font-medium border-slate-200 text-slate-600 rounded-lg"
                onClick={() => setShowManage(!showManage)}>
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Manage
              </Button>
              {showManage && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                  <button className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    onClick={async () => {
                      setShowManage(false)
                      try {
                        const { data } = await api.get('/coupons?limit=10000')
                        const headers = ['Kode', 'Tipe', 'Nilai', 'Program', 'Pakai', 'Maks', 'Status']
                        const rows = data.data.map((c: any) => [c.code, c.discountType, c.discountValue, c.program?.name || 'Semua', c.usedCount, c.maxUses || 'Unlimited', c.isActive ? 'Aktif' : 'Nonaktif'])
                        const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')
                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `kupon-${new Date().toISOString().slice(0, 10)}.csv`
                        a.click(); URL.revokeObjectURL(url)
                        toast({ title: 'CSV berhasil diexport' })
                      } catch { toast({ title: 'Gagal export CSV' }) }
                    }}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                  <button className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    onClick={() => { setShowManage(false); refetch(); toast({ title: 'Data diperbarui' }) }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
                  </button>
                </div>
              )}
              {showManage && <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />}
            </div>
            <Button className="gap-2 h-9 text-xs font-medium" onClick={() => setAddModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Tambah Kupon
            </Button>
          </div>
        </div>

        {/* ── Toolbar Bawah: Search ── */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Total <span className="font-semibold text-slate-700">{data?.pagination?.total || 0}</span> kupon
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari kode kupon..."
              className="pl-9 h-9 w-52 rounded-lg text-xs border-slate-200 bg-slate-50 shadow-none focus-visible:ring-1 focus-visible:ring-indigo-100 focus-visible:border-indigo-300"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Tag className="h-3 w-3" /> Kode
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Deskripsi</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Diskon</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Program</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pemakaian</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kadaluarsa</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</span>
                </th>
                <th className="px-4 py-3.5 text-right border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-24" /></td>)}
                </tr>
              ))}
              {data?.data?.map((c: any) => {
                const expired = isExpired(c)
                const full = isFull(c)
                const active = c.isActive && !expired && !full
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-[13px] border border-slate-100">
                      <span className="font-bold text-indigo-700 font-mono text-xs">{c.code}</span>
                    </td>
                    <td className="px-4 py-[13px] text-slate-600 border border-slate-100">
                      <span className="text-xs text-slate-500">{c.description || '-'}</span>
                    </td>
                    <td className="px-4 py-[13px] border border-slate-100">
                      <span className="font-semibold text-emerald-600">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
                      </span>
                      {c.maxDiscount && Number(c.maxDiscount) > 0 && (
                        <span className="text-[10px] text-slate-400 block">Max: {formatCurrency(c.maxDiscount)}</span>
                      )}
                    </td>
                    <td className="px-4 py-[13px] text-slate-600 border border-slate-100">
                      {c.program?.name || <span className="text-slate-400 text-xs italic">Semua program</span>}
                    </td>
                    <td className="px-4 py-[13px] border border-slate-100">
                      <span className={full ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                        {c.usedCount}
                      </span>
                      {c.maxUses > 0 && <span className="text-slate-300 mx-1">/</span>}
                      {c.maxUses > 0 && <span className="text-slate-500">{c.maxUses}</span>}
                      {c.maxUses === 0 && <span className="text-slate-400 text-xs ml-1">Unlimited</span>}
                    </td>
                    <td className="px-4 py-[13px] border border-slate-100">
                      {c.expiresAt ? (
                        <span className={expired ? 'text-red-500 text-xs font-medium' : 'text-slate-600 text-xs'}>
                          {formatDate(c.expiresAt)}
                        </span>
                      ) : <span className="text-slate-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-[13px] border border-slate-100">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                        active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        !c.isActive ? 'bg-slate-100 text-slate-400 border-slate-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {active ? 'Aktif' : !c.isActive ? 'Nonaktif' : expired ? 'Kadaluarsa' : 'Penuh'}
                      </span>
                    </td>
                    <td className="px-4 py-[13px] text-right border border-slate-100">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => { setSelectedCoupon(c); setEditModalOpen(true) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {c.isActive && (
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => { setSelectedCoupon(c); setDeleteConfirmOpen(true) }}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-xs text-slate-400 border border-slate-100">
                    Belum ada kupon. Klik "Tambah Kupon" untuk membuat kupon baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {data?.pagination && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
            <p className="text-xs text-slate-400">
              Total <span className="font-semibold text-slate-700">{data.pagination.total}</span> kupon
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 rounded border-slate-200 text-slate-500 text-xs"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <span className="text-xs font-semibold text-slate-700 bg-slate-50 h-7 w-10 flex items-center justify-center rounded border border-slate-200">{page}</span>
              <Button size="sm" variant="outline" className="h-7 rounded border-slate-200 text-slate-500 text-xs"
                disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </div>

      <CouponFormModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        programs={programs}
      />
      <CouponFormModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedCoupon(null) }}
        coupon={selectedCoupon}
        programs={programs}
      />
      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setSelectedCoupon(null) }}
        coupon={selectedCoupon}
        onConfirm={() => selectedCoupon && toggleMutate(selectedCoupon.id)}
        isPending={togglePending}
      />
    </div>
  )
}
