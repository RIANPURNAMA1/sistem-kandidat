import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, Input, Label, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Search, Loader2, FolderTree } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'
import SideModal from '@/components/admin/SideModal'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  isActive: boolean
  sortOrder: number
  _count: { templates: number }
}

const defaultForm = { name: '', description: '', icon: '', color: '#6366f1', sortOrder: 0 }

export default function AdminFollowUpCategories() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(defaultForm)

  const { data, isLoading } = useQuery({
    queryKey: ['follow-up-categories', search],
    queryFn: async () => {
      const { data } = await api.get('/follow-ups/categories', { params: { search } })
      return data.data as Category[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (editing) {
        const { data } = await api.put(`/follow-ups/categories/${editing.id}`, values)
        return data
      }
      const { data } = await api.post('/follow-ups/categories', values)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-categories'] })
      setModalOpen(false)
      setEditing(null)
      setForm(defaultForm)
      toast({ title: editing ? 'Kategori berhasil diperbarui' : 'Kategori berhasil dibuat' })
    },
    onError: (err: any) => toast({ title: 'Gagal menyimpan', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/follow-ups/categories/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-categories'] })
      toast({ title: 'Kategori berhasil dihapus' })
    },
    onError: (err: any) => toast({ title: 'Gagal menghapus', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  function openEdit(cat: Category) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '', color: cat.color || '#6366f1', sortOrder: cat.sortOrder })
    setModalOpen(true)
  }

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Kategori Follow-Up</h1>
          <p className="text-sm text-muted-foreground">Kelola kategori template follow-up</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari kategori..."
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map(cat => (
            <Card key={cat.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: cat.color || '#6366f1' }}>
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat._count.templates} template</p>
                    </div>
                  </div>
                  <Badge variant={cat.isActive ? 'success' : 'secondary'}>{cat.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                </div>
                {cat.description && <p className="text-xs text-muted-foreground mt-2">{cat.description}</p>}
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-red-500 hover:text-red-700" onClick={() => { if (confirm('Hapus kategori ini?')) deleteMutation.mutate(cat.id) }}>
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">Belum ada kategori</div>
          )}
        </div>
      )}

      <SideModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? 'Edit Kategori' : 'Tambah Kategori'}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nama Kategori</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pengingat Pembayaran" />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi kategori" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ikon (opsional)</Label>
              <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="FolderTree" />
            </div>
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="flex-1" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Urutan</Label>
            <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </div>
          <div className="pt-4 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditing(null) }}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Simpan' : 'Buat'}
            </Button>
          </div>
        </div>
      </SideModal>
    </div>
  )
}
