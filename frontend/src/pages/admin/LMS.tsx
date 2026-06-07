import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Edit, Power, X, Loader2, Search, ChevronLeft, ChevronRight, BookOpen, Users, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

const emptyForm = { title: '', slug: '', description: '', coverUrl: '' }

function CourseFormModal({ isOpen, onClose, course }: { isOpen: boolean; onClose: () => void; course?: any }) {
  const queryClient = useQueryClient()
  const isEdit = !!course
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        slug: course.slug || '',
        description: course.description || '',
        coverUrl: course.coverUrl || '',
      })
    } else setFormData(emptyForm)
  }, [course])

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        const res = await api.put(`/lms/courses/${course.id}`, data)
        return res.data
      } else {
        const res = await api.post('/lms/courses', data)
        return res.data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lms-courses'] })
      toast({ title: isEdit ? 'Course diperbarui' : 'Course berhasil dibuat' })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold">{isEdit ? 'Edit Course' : 'Tambah Course Baru'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutate(formData) }} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Judul Course</Label>
            <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slug</Label>
            <Input required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="text-xs" rows={4} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL Cover (opsional)</Label>
            <Input value={formData.coverUrl} onChange={e => setFormData({ ...formData, coverUrl: e.target.value })} placeholder="https://..." className="text-xs" />
          </div>
          {formData.coverUrl && (
            <img src={formData.coverUrl} alt="preview" className="h-32 w-full object-cover rounded" />
          )}
        </form>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
          <Button type="button" variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button type="button" className="text-xs" onClick={() => mutate(formData)} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLMSPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-lms-courses', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/lms/courses?${params}`)
      return data
    },
  })

  const { mutate: toggleMutate } = useMutation({
    mutationFn: (id: string) => api.patch(`/lms/courses/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lms-courses'] })
      toast({ title: 'Status course diubah' })
    },
    onError: () => toast({ title: 'Gagal', variant: 'destructive' }),
  })

  const courses = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="min-h-screen">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-semibold text-slate-800">Learning Management System</h2>
            <span className="text-xs text-slate-400">Page {page} of {pagination?.totalPages || 1}</span>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <button className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <div className="w-px bg-slate-200" />
              <button className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={page >= (pagination?.totalPages || 1)} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
            <Button className="gap-2 h-9 text-xs font-medium" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Tambah Course
            </Button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Total <span className="font-semibold text-slate-700">{pagination?.total || 0}</span> course</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Cari course..." className="pl-9 h-9 w-52 rounded-lg text-xs border-slate-200 bg-slate-50" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"><BookOpen className="h-3 w-3 inline mr-1" /> Course</span></th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Modul</span></th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"><Users className="h-3 w-3 inline mr-1" /> Siswa</span></th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</span></th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dibuat</span></th>
                <th className="px-4 py-3.5 text-right border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-24" /></td>)}
                </tr>
              ))}
              {courses.map((course: any) => (
                <tr key={course.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-[13px] border border-slate-100">
                    <div className="flex items-center gap-3">
                      {course.coverUrl ? (
                        <img src={course.coverUrl} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-[#009ce1]/10 flex items-center justify-center text-[#009ce1]"><BookOpen className="h-5 w-5" /></div>
                      )}
                      <div>
                        <Link to={`/admin/lms/${course.id}`} className="font-semibold text-slate-800 hover:text-[#009ce1]">{course.title}</Link>
                        <span className="text-[10px] text-slate-400 block">/{course.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100 text-slate-600">{course._count?.modules || 0}</td>
                  <td className="px-4 py-[13px] border border-slate-100 text-slate-600">{course._count?.enrollments || 0}</td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold border ${course.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                      {course.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100 text-xs text-slate-500">{formatDate(course.createdAt)}</td>
                  <td className="px-4 py-[13px] text-right border border-slate-100">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-[#009ce1]"
                        onClick={() => { setSelected(course); setEditOpen(true) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => toggleMutate(course.id)}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !courses.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-xs text-slate-400 border border-slate-100">
                    Belum ada course. Klik "Tambah Course" untuk membuat course baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
            <p className="text-xs text-slate-400">Total <span className="font-semibold text-slate-700">{pagination.total}</span> course</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 rounded border-slate-200 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <span className="text-xs font-semibold text-slate-700 bg-slate-50 h-7 w-10 flex items-center justify-center rounded border border-slate-200">{page}</span>
              <Button size="sm" variant="outline" className="h-7 rounded border-slate-200 text-xs" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </div>

      <CourseFormModal key={addOpen ? 'add' : 'add-closed'} isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <CourseFormModal key={selected?.id || 'edit-closed'} isOpen={editOpen} onClose={() => { setEditOpen(false); setSelected(null) }} course={selected} />
    </div>
  )
}
