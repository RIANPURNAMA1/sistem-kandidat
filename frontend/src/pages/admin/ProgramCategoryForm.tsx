import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Loader2, Tag } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

export default function ProgramCategoryForm() {
  const queryClient = useQueryClient()
  const [editCat, setEditCat] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', icon: '' })

  const { data: catsData, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/programs/categories')
      return data.data || data || []
    },
  })
  const categories = Array.isArray(catsData) ? catsData : []

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{editCat ? 'Edit Kategori' : 'Tambah Kategori Baru'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Nama Kategori</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="cth: Kerja ke Jepang" />
            </div>
            <div className="space-y-1 w-28">
              <Label className="text-xs">Icon</Label>
              <Input value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} placeholder="🇯🇵" />
            </div>
            <Button type="submit" size="sm" disabled={createPending || updatePending}>
              {(createPending || updatePending) ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</> : editCat ? 'Simpan' : 'Tambah'}
            </Button>
            {editCat && (
              <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>Batal</Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Daftar Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Belum ada kategori</p>
          ) : (
            <div className="space-y-2">
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => startEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      disabled={deletePending}
                      onClick={() => {
                        if (window.confirm(`Yakin ingin menghapus kategori "${cat.name}"?`)) {
                          deleteMutate(cat.id)
                        }
                      }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
