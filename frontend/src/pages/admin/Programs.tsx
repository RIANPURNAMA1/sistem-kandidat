import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Power, X, Loader2, Copy, Search, ChevronLeft, ChevronRight, Grid, SlidersHorizontal, Download, RefreshCw, MoreVertical, Clock, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/index'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

const emptyForm = { name: '', description: '', fee: '', quota: '', categoryId: '', affiliateCommission: '', commissionType: 'FIXED', status: 'AKTIF' }

function ProgramFormModal({ isOpen, onClose, program, categories }: {
  isOpen: boolean
  onClose: () => void
  program?: any
  categories: any[]
}) {
  const queryClient = useQueryClient()
  const isEdit = !!program
  const [formData, setFormData] = useState(program ? {
    name: program.name,
    description: program.description,
    fee: String(program.fee),
    quota: String(program.quota),
    categoryId: program.categoryId,
    affiliateCommission: String(program.affiliateCommission || ''),
    commissionType: program.commissionType || 'FIXED',
    status: program.status,
  } : emptyForm)

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => isEdit ? api.put(`/programs/${program.id}`, data) : api.post('/programs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] })
      toast({ title: isEdit ? 'Program berhasil diperbarui' : 'Program berhasil dibuat' })
      onClose()
    },
    onError: () => toast({ title: isEdit ? 'Gagal memperbarui program' : 'Gagal membuat program', variant: 'destructive' })
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold">{isEdit ? 'Edit Program' : 'Tambah Program Baru'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1">
            <Label>Nama Program</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label>Deskripsi</Label>
            <Textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                <option value="">Pilih kategori</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="AKTIF">Aktif</option>
                <option value="NONAKTIF">Nonaktif</option>
                <option value="PENUH">Penuh</option>
                <option value="SELESAI">Selesai</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Biaya (Rp)</Label>
              <Input type="number" required value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Kuota</Label>
              <Input type="number" required value={formData.quota} onChange={e => setFormData({...formData, quota: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Komisi Afiliasi</Label>
              <Input type="number" value={formData.affiliateCommission} onChange={e => setFormData({...formData, affiliateCommission: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Tipe Komisi</Label>
              <Select value={formData.commissionType} onChange={e => setFormData({...formData, commissionType: e.target.value})}>
                <option value="FIXED">Fixed</option>
                <option value="PERCENTAGE">Persentase</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Link Registrasi</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={isEdit ? `${window.location.origin}/register?programId=${program.id}` : `${window.location.origin}/register?programId=... (tersedia setelah dibuat)`}
                className="text-[11px] font-mono text-slate-500"
              />
              {isEdit && (
                <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register?programId=${program.id}`); toast({ title: 'Link disalin!' }) }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => mutate(formData)} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CategoryManageModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [editCat, setEditCat] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', icon: '' })

  const { data: catsData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => { const { data } = await api.get('/programs/categories'); return data },
  })
  const categories = catsData?.data || catsData || []

  const { mutate: createMutate, isPending: createPending } = useMutation({
    mutationFn: (d: any) => api.post('/programs/categories', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      toast({ title: 'Kategori berhasil dibuat' })
      setFormData({ name: '', icon: '' })
    },
    onError: () => toast({ title: 'Gagal membuat kategori', variant: 'destructive' }),
  })

  const { mutate: updateMutate, isPending: updatePending } = useMutation({
    mutationFn: (d: any) => api.put(`/programs/categories/${editCat.id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      toast({ title: 'Kategori berhasil diperbarui' })
      setEditCat(null)
      setFormData({ name: '', icon: '' })
    },
    onError: () => toast({ title: 'Gagal memperbarui kategori', variant: 'destructive' }),
  })

  const { mutate: deleteMutate, isPending: deletePending } = useMutation({
    mutationFn: (id: string) => api.delete(`/programs/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      toast({ title: 'Kategori berhasil dihapus' })
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Gagal menghapus kategori', variant: 'destructive' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (editCat) updateMutate(formData)
    else createMutate(formData)
  }

  const startEdit = (cat: any) => {
    setEditCat(cat)
    setFormData({ name: cat.name, icon: cat.icon || '' })
  }

  const cancelEdit = () => {
    setEditCat(null)
    setFormData({ name: '', icon: '' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div
        className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold">Kelola Kategori</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Form Tambah/Edit */}
          <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-600">{editCat ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
            <div className="space-y-1">
              <Label>Nama Kategori</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="cth: Kerja ke Jepang" />
            </div>
            <div className="space-y-1">
              <Label>Icon (emoji)</Label>
              <Input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="cth: 🇯🇵" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createPending || updatePending}>
                {(createPending || updatePending) ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : editCat ? 'Simpan' : 'Tambah'}
              </Button>
              {editCat && (
                <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>Batal</Button>
              )}
            </div>
          </form>

          {/* Daftar Kategori */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daftar Kategori</h3>
            {categories.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada kategori</p>
            )}
            {categories.map((cat: any) => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cat.icon || <Tag className="h-4 w-4 text-slate-400" />}</span>
                  <div>
                    <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                    <span className="text-xs text-slate-400 ml-2">({cat._count?.programs || 0} program)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => startEdit(cat)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    disabled={deletePending}
                    onClick={() => {
                      if (window.confirm(`Yakin ingin menghapus kategori "${cat.name}"?`)) {
                        deleteMutate(cat.id)
                      }
                    }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmDialog({ isOpen, onClose, program, onConfirm, isPending }: {
  isOpen: boolean
  onClose: () => void
  program: any
  onConfirm: () => void
  isPending: boolean
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-2">Konfirmasi</h2>
        <p className="text-xs text-muted-foreground mb-6">
          Yakin ingin menonaktifkan program <strong>{program?.name}</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : 'Nonaktifkan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminProgramsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<any>(null)
  const [showManage, setShowManage] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/register?programId=${id}`
    navigator.clipboard.writeText(link)
    toast({ title: 'Link registrasi disalin!' })
  }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-programs', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/programs?${params}`)
      return data
    },
  })
  const { data: catsData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => { const { data } = await api.get('/programs/categories'); return data },
  })
  const categories = catsData?.data || catsData || []

  const { mutate: toggleMutate, isPending: togglePending } = useMutation({
    mutationFn: (id: string) => api.delete(`/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] })
      toast({ title: 'Program berhasil dinonaktifkan' })
      setDeleteConfirmOpen(false)
    },
    onError: () => toast({ title: 'Gagal menonaktifkan program', variant: 'destructive' })
  })

  return (
    <div className="min-h-screen">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">

        {/* ── Toolbar Atas ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-semibold text-slate-800">Manajemen Program</h2>
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
                        const { data } = await api.get('/programs?limit=10000')
                        const headers = ['Nama', 'Kategori', 'Biaya', 'Kuota', 'Terisi', 'Komisi', 'Status']
                        const rows = data.data.map((p: any) => [p.name, p.category?.name || '-', p.fee, p.quota, p._count?.applications || 0, p.affiliateCommission || '-', p.status])
                        const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `program-${new Date().toISOString().slice(0, 10)}.csv`
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
                  <div className="border-t border-slate-100 my-1" />
                  <button className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    onClick={() => { setShowManage(false); setCategoryModalOpen(true) }}>
                    <Tag className="h-3.5 w-3.5" /> Kelola Kategori
                  </button>
                </div>
              )}
              {showManage && <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />}
            </div>
            <Button className="gap-2 h-9 text-xs font-medium" onClick={() => setAddModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Tambah Program
            </Button>
          </div>
        </div>

        {/* ── Toolbar Bawah: Search ── */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Total <span className="font-semibold text-slate-700">{data?.pagination?.total || 0}</span> program
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari program..."
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
                    <Grid className="h-3 w-3" /> Nama Program
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kategori</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Biaya</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Clock className="h-3 w-3" /> Kuota
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Komisi</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Link</span>
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
              {data?.data?.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-[13px] border border-slate-100">
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</div>
                  </td>
                  <td className="px-4 py-[13px] text-slate-600 border border-slate-100">{p.category?.name || '-'}</td>
                  <td className="px-4 py-[13px] font-semibold text-indigo-600 border border-slate-100">{formatCurrency(p.fee)}</td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className={p._count?.applications >= p.quota ? 'text-red-600 font-bold' : 'font-medium text-slate-800'}>
                      {p._count?.applications || 0}
                    </span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="text-slate-500">{p.quota}</span>
                  </td>
                  <td className="px-4 py-[13px] text-slate-600 border border-slate-100">
                    {p.affiliateCommission ? (
                      <span>{formatCurrency(p.affiliateCommission)}{p.commissionType === 'PERCENTAGE' ? '%' : ''}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                        /register?programId={p.id.slice(0, 8)}...
                      </span>
                      <button
                        onClick={() => copyLink(p.id)}
                        className="h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-[13px] text-right border border-slate-100">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        onClick={() => { setSelectedProgram(p); setEditModalOpen(true) }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {p.status !== 'NONAKTIF' && p.status !== 'SELESAI' && (
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          onClick={() => { setSelectedProgram(p); setDeleteConfirmOpen(true) }}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-xs text-slate-400 border border-slate-100">
                    Belum ada program. Klik "Tambah Program" untuk membuat program baru.
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
              Total <span className="font-semibold text-slate-700">{data.pagination.total}</span> program
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

      <ProgramFormModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        categories={categories}
      />
      <ProgramFormModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedProgram(null) }}
        program={selectedProgram}
        categories={categories}
      />
      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setSelectedProgram(null) }}
        program={selectedProgram}
        onConfirm={() => selectedProgram && toggleMutate(selectedProgram.id)}
        isPending={togglePending}
      />
      <CategoryManageModal
        isOpen={categoryModalOpen}
        onClose={() => { setCategoryModalOpen(false); refetch() }}
      />
    </div>
  )
}
