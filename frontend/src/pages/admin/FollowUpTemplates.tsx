import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, Input, Label, Badge, Textarea, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Search, Loader2, MessageSquare, Mail, Play } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'
import SideModal from '@/components/admin/SideModal'
import { useNavigate } from 'react-router-dom'

interface Template {
  id: string
  categoryId: string
  name: string
  subject: string | null
  message: string
  channel: string
  placeholders: string | null
  isActive: boolean
  category: { id: string; name: string; color: string | null }
  _count: { logs: number }
}

interface Category {
  id: string
  name: string
  color: string | null
}

const defaultForm = { categoryId: '', name: '', subject: '', message: '', channel: 'WHATSAPP', placeholders: '', isActive: true }

export default function AdminFollowUpTemplates() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [form, setForm] = useState(defaultForm)

  const { data: categories } = useQuery({
    queryKey: ['follow-up-categories-all'],
    queryFn: async () => {
      const { data } = await api.get('/follow-ups/categories')
      return data.data as Category[]
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['follow-up-templates', search, filterCategory],
    queryFn: async () => {
      const { data } = await api.get('/follow-ups/templates', { params: { search, categoryId: filterCategory || undefined } })
      return data.data as Template[]
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (editing) {
        const { data } = await api.put(`/follow-ups/templates/${editing.id}`, values)
        return data
      }
      const { data } = await api.post('/follow-ups/templates', values)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-templates'] })
      setModalOpen(false)
      setEditing(null)
      setForm(defaultForm)
      toast({ title: editing ? 'Template berhasil diperbarui' : 'Template berhasil dibuat' })
    },
    onError: (err: any) => toast({ title: 'Gagal menyimpan', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/follow-ups/templates/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-templates'] })
      toast({ title: 'Template berhasil dihapus' })
    },
    onError: (err: any) => toast({ title: 'Gagal menghapus', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  function openEdit(tpl: Template) {
    setEditing(tpl)
    setForm({
      categoryId: tpl.categoryId,
      name: tpl.name,
      subject: tpl.subject || '',
      message: tpl.message,
      channel: tpl.channel,
      placeholders: tpl.placeholders || '',
      isActive: tpl.isActive,
    })
    setModalOpen(true)
  }

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const channelIcon = (ch: string) => ch === 'WHATSAPP' ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Template Follow-Up</h1>
          <p className="text-sm text-muted-foreground">Kelola template pesan follow-up</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Template
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari template..." className="pl-8" />
        </div>
        <div className="w-48">
          <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">Semua Kategori</option>
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map(tpl => (
            <Card key={tpl.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      {channelIcon(tpl.channel)} {tpl.channel}
                    </Badge>
                    {tpl.category && (
                      <Badge className="text-xs" style={{ backgroundColor: tpl.category.color || '#6366f1', color: '#fff' }}>
                        {tpl.category.name}
                      </Badge>
                    )}
                  </div>
                  <Badge variant={tpl.isActive ? 'success' : 'secondary'} className="text-xs">{tpl.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                </div>
                <p className="font-semibold text-sm">{tpl.name}</p>
                {tpl.subject && <p className="text-xs text-muted-foreground mt-0.5">{tpl.subject}</p>}
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tpl.message}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{tpl._count.logs} terkirim</span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(tpl)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-indigo-600" onClick={() => navigate(`/admin/follow-up/send?template=${tpl.id}`)} title="Kirim">
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { if (confirm('Hapus template ini?')) deleteMutation.mutate(tpl.id) }} title="Hapus">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">Belum ada template</div>
          )}
        </div>
      )}

      <SideModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? 'Edit Template' : 'Tambah Template'}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Pilih Kategori</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nama Template</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pengingat Pembayaran" />
          </div>
          <div className="space-y-1.5">
            <Label>Subjek (opsional, untuk email)</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subjek pesan" />
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pesan</Label>
            <Textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tulis pesan... Gunakan {nama}, {program}, {nik}, {phone} sebagai placeholder"
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Placeholder tersedia: {'{nama}'}, {'{nik}'}, {'{phone}'}, {'{program}'}, {'{status_pendaftaran}'}, {'{biaya_program}'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Placeholder Kustom (dipisah koma)</Label>
            <Input value={form.placeholders} onChange={e => setForm(f => ({ ...f, placeholders: e.target.value }))} placeholder="e.g. tanggal, tempat" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <Label htmlFor="isActive" className="mb-0">Aktif</Label>
          </div>
          <div className="pt-4 border-t flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditing(null) }}>Batal</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.categoryId || !form.message}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Simpan' : 'Buat'}
            </Button>
          </div>
        </div>
      </SideModal>
    </div>
  )
}
