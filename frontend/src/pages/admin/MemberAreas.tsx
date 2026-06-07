import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Power, X, Loader2, Search, ChevronLeft, ChevronRight, SlidersHorizontal, RefreshCw, Users, FileText, Globe, Lock, UserPlus, FolderOpen, Check, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

const emptyForm = {
  name: '', slug: '', description: '', coverUrl: '', avatarUrl: '',
  categoryId: '', visibility: 'PRIVATE', targetRole: '', maxMembers: '',
}

function AreaFormModal({ isOpen, onClose, area, categories }: {
  isOpen: boolean
  onClose: () => void
  area?: any
  categories: any[]
}) {
  const queryClient = useQueryClient()
  const isEdit = !!area
  const [formData, setFormData] = useState(emptyForm)
  const [userSearch, setUserSearch] = useState('')
  const [userFilterRole, setUserFilterRole] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name || '',
        slug: area.slug || '',
        description: area.description || '',
        coverUrl: area.coverUrl || '',
        avatarUrl: area.avatarUrl || '',
        categoryId: area.categoryId || '',
        visibility: area.visibility || 'PRIVATE',
        targetRole: area.targetRole || '',
        maxMembers: area.maxMembers ? String(area.maxMembers) : '',
      })
    } else {
      setFormData(emptyForm)
      setSelectedUsers([])
      setUserSearch('')
      setUserFilterRole('')
    }
  }, [area, isOpen])

  const { data: allUsersData } = useQuery({
    queryKey: ['all-users', userSearch, userFilterRole],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (userSearch) params.set('search', userSearch)
      if (userFilterRole) params.set('role', userFilterRole)
      const { data } = await api.get(`/member-areas/users/available?${params}`)
      return data
    },
    enabled: isOpen,
  })

  const { data: membersData } = useQuery({
    queryKey: ['edit-area-members', area?.id],
    queryFn: async () => { const { data } = await api.get(`/member-areas/${area.id}/members`); return data },
    enabled: isOpen && isEdit && !!area?.id,
  })

  const { mutate: createAreaMutate, isPending: createPending } = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        maxMembers: data.maxMembers ? parseInt(data.maxMembers) : undefined,
        categoryId: data.categoryId || undefined,
        targetRole: data.targetRole || undefined,
      }
      const { data: result } = await api.post('/member-areas', payload)
      if (selectedUsers.length > 0 && result.data) {
        await Promise.all(selectedUsers.map((userId: string) =>
          api.post(`/member-areas/${result.data.id}/invite`, { userId })
        ))
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-member-areas'] })
      toast({ title: 'Area berhasil dibuat' })
      setSelectedUsers([])
      setUserSearch('')
      setUserFilterRole('')
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal membuat area', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const { mutate: updateAreaMutate, isPending: updatePending } = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        maxMembers: data.maxMembers ? parseInt(data.maxMembers) : undefined,
        categoryId: data.categoryId || undefined,
        targetRole: data.targetRole || undefined,
      }
      await api.put(`/member-areas/${area.id}`, payload)
      // Invite newly selected users
      if (selectedUsers.length > 0) {
        await Promise.all(selectedUsers.map((userId: string) =>
          api.post(`/member-areas/${area.id}/invite`, { userId })
        ))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-member-areas'] })
      toast({ title: 'Area berhasil diperbarui' })
      setSelectedUsers([])
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal memperbarui area', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const isPending = createPending || updatePending

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter((id: string) => id !== userId) : [...prev, userId])
  }

  const existingMemberIds = new Set(membersData?.data?.map((m: any) => m.userId) || [])

  if (!isOpen) return null

  const allUsers = allUsersData?.data || []

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold">{isEdit ? 'Edit Member Area' : 'Tambah Member Area Baru'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (isEdit) updateAreaMutate(formData)
          else createAreaMutate(formData)
        }} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Nama Area</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Affiliate Area" className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slug</Label>
            <Input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} placeholder="affiliate-area" className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Deskripsi area (opsional)" className="text-xs" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Kategori</Label>
              <Select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="text-xs">
                <option value="">Tanpa Kategori</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Visibilitas</Label>
              <Select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})} className="text-xs">
                <option value="PRIVATE">Private (Hanya Member)</option>
                <option value="PUBLIC">Public (Semua Bisa Lihat)</option>
                <option value="INVITE_ONLY">Invite Only (Undang Saja)</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Role Target (opsional)</Label>
              <Select value={formData.targetRole} onChange={e => setFormData({...formData, targetRole: e.target.value})} className="text-xs">
                <option value="">Semua Role</option>
                <option value="KANDIDAT">Kandidat Saja</option>
                <option value="AFFILIATE">Affiliate Saja</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Maks. Member (opsional)</Label>
              <Input type="number" value={formData.maxMembers} onChange={e => setFormData({...formData, maxMembers: e.target.value})} placeholder="0 = unlimited" className="text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL Avatar (opsional)</Label>
            <Input value={formData.avatarUrl} onChange={e => setFormData({...formData, avatarUrl: e.target.value})} placeholder="https://..." className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL Cover (opsional)</Label>
            <Input value={formData.coverUrl} onChange={e => setFormData({...formData, coverUrl: e.target.value})} placeholder="https://..." className="text-xs" />
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Tambah Member Langsung</Label>
                {selectedUsers.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#009ce1]/10 text-[#009ce1] font-semibold">
                    {selectedUsers.length} dipilih
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Cari email..."
                  className="h-7 text-xs"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <select
                  value={userFilterRole}
                  onChange={e => setUserFilterRole(e.target.value)}
                  className="h-7 px-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009ce1]/20"
                >
                  <option value="">Semua Role</option>
                  <option value="KANDIDAT">Kandidat</option>
                  <option value="AFFILIATE">Affiliate</option>
                </select>
              </div>
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-50">
                {allUsers.map((u: any) => {
                  const isExistingMember = existingMemberIds.has(u.id)
                  const checked = selectedUsers.includes(u.id)
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 px-3 py-2 ${isExistingMember ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'} transition-colors ${checked ? 'bg-[#009ce1]/5' : ''}`}
                    >
                      {!isExistingMember && (
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={() => toggleUser(u.id)}
                        />
                      )}
                      {!isExistingMember ? (
                        <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          checked ? 'bg-[#009ce1] border-[#009ce1]' : 'border-slate-300 bg-white'
                        }`}>
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </div>
                      )}
                      <div className="h-7 w-7 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700 truncate">{u.email.split('@')[0]}</p>
                        <p className="text-[10px] text-slate-400">{u.role}</p>
                      </div>
                      {isExistingMember ? (
                        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                          Sudah member
                        </span>
                      ) : checked ? (
                        <span className="text-[9px] font-semibold text-[#009ce1] bg-[#009ce1]/10 px-1.5 py-0.5 rounded flex-shrink-0">
                          Akan ditambahkan
                        </span>
                      ) : null}
                    </label>
                  )
                })}
                {!allUsers.length && (
                  <div className="px-3 py-6 text-center">
                    <p className="text-xs text-slate-400">Tidak ada user</p>
                  </div>
                )}
              </div>
            </div>
        </form>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
          <Button type="button" variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button type="button" className="text-xs" onClick={() => {
            if (isEdit) updateAreaMutate(formData)
            else createAreaMutate(formData)
          }} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmDialog({ isOpen, onClose, area, onConfirm, isPending }: {
  isOpen: boolean
  onClose: () => void
  area: any
  onConfirm: () => void
  isPending: boolean
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-2">Konfirmasi</h2>
        <p className="text-xs text-muted-foreground mb-6">
          Yakin ingin menonaktifkan area <strong>{area?.name}</strong>?
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

export default function AdminMemberAreasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState<any>(null)
  const [showManage, setShowManage] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-member-areas', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/member-areas?${params}`)
      return data
    },
  })

  const { data: catData } = useQuery({
    queryKey: ['member-area-categories'],
    queryFn: async () => { const { data } = await api.get('/member-areas/categories'); return data },
  })
  const categories = catData?.data || []

  const { mutate: toggleMutate, isPending: togglePending } = useMutation({
    mutationFn: (id: string) => api.patch(`/member-areas/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-member-areas'] })
      toast({ title: 'Status area berhasil diubah' })
      setDeleteConfirmOpen(false)
    },
    onError: () => toast({ title: 'Gagal mengubah status area', variant: 'destructive' }),
  })

  const visibilityIcon = (v: string) => {
    switch (v) {
      case 'PUBLIC': return <Globe className="h-3.5 w-3.5" />
      case 'PRIVATE': return <Lock className="h-3.5 w-3.5" />
      case 'INVITE_ONLY': return <UserPlus className="h-3.5 w-3.5" />
      default: return <Lock className="h-3.5 w-3.5" />
    }
  }

  const visibilityLabel = (v: string) => {
    switch (v) {
      case 'PUBLIC': return 'Public'
      case 'PRIVATE': return 'Private'
      case 'INVITE_ONLY': return 'Invite Only'
      default: return v
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">

        {/* ── Toolbar Atas ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-semibold text-slate-800">Member Area</h2>
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
                    onClick={() => { setShowManage(false); refetch(); toast({ title: 'Data diperbarui' }) }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
                  </button>
                </div>
              )}
              {showManage && <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />}
            </div>
            <Button className="gap-2 h-9 text-xs font-medium" onClick={() => setAddModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Tambah Area
            </Button>
          </div>
        </div>

        {/* ── Toolbar Bawah: Search ── */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Total <span className="font-semibold text-slate-700">{data?.pagination?.total || 0}</span> area
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari area..."
              className="pl-9 h-9 w-52 rounded-lg text-xs border-slate-200 bg-slate-50 shadow-none focus-visible:ring-1 focus-visible:ring-[#009ce1]/10 focus-visible:border-[#009ce1]/30"
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
                    <FolderOpen className="h-3 w-3" /> Nama
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kategori</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Visibilitas</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Users className="h-3 w-3" /> Member
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <FileText className="h-3 w-3" /> Post
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                    <Users className="h-3 w-3" /> Kandidat
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                    <DollarSign className="h-3 w-3" /> Pendapatan
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dibuat</span>
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
                  {[...Array(10)].map((_, j) => <td key={j} className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-24" /></td>)}
                </tr>
              ))}
              {data?.data?.map((area: any) => (
                <tr key={area.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-[13px] border border-slate-100">
                    <div className="flex items-center gap-3">
                      {area.avatarUrl ? (
                        <img src={area.avatarUrl} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-[#009ce1]/10 flex items-center justify-center text-[#009ce1] font-bold text-xs">
                          {area.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-800">{area.name}</span>
                        <span className="text-[10px] text-slate-400 block">/{area.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-[13px] text-slate-600 border border-slate-100">
                    {area.category?.name || <span className="text-slate-400 text-xs italic">-</span>}
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200">
                      {visibilityIcon(area.visibility)}
                      {visibilityLabel(area.visibility)}
                    </span>
                    {area.targetRole && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">{area.targetRole}</span>
                    )}
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className="font-semibold text-slate-700">{area._count?.members || 0}</span>
                    {area.maxMembers && <span className="text-slate-400 text-xs"> / {area.maxMembers}</span>}
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className="text-slate-600">{area._count?.posts || 0}</span>
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className="text-sm font-bold text-slate-800">{area.stats?.totalReferrals || 0}</span>
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    {area.stats?.totalReferralRevenue > 0 ? (
                      <span className="text-sm font-bold text-emerald-600">Rp {(area.stats.totalReferralRevenue / 1000000).toFixed(1)}jt</span>
                    ) : (
                      <span className="text-slate-300">Rp 0</span>
                    )}
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className="text-slate-500 text-xs">{formatDate(area.createdAt)}</span>
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                      area.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {area.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-[13px] text-right border border-slate-100">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-[#009ce1] hover:bg-[#009ce1]/5"
                        onClick={() => { setSelectedArea(area); setEditModalOpen(true) }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => { setSelectedArea(area); setDeleteConfirmOpen(true) }}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-xs text-slate-400 border border-slate-100">
                    Belum ada member area. Klik "Tambah Area" untuk membuat area baru.
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
              Total <span className="font-semibold text-slate-700">{data.pagination.total}</span> area
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

      <AreaFormModal
        key={addModalOpen ? 'add' : 'add-closed'}
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        categories={categories}
      />
      <AreaFormModal
        key={selectedArea?.id || 'edit-closed'}
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedArea(null) }}
        area={selectedArea}
        categories={categories}
      />
      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setSelectedArea(null) }}
        area={selectedArea}
        onConfirm={() => selectedArea && toggleMutate(selectedArea.id)}
        isPending={togglePending}
      />
    </div>
  )
}
