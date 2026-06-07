import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Trash2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label, Select } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

export default function AdminLMSEnrollments() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [courseFilter, setCourseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedUser, setSelectedUser] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-lms-enrollments', page, courseFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (courseFilter) params.set('courseId', courseFilter)
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/lms/enrollments?${params}`)
      return data
    },
  })

  const { data: coursesData } = useQuery({
    queryKey: ['all-courses'],
    queryFn: async () => { const { data } = await api.get('/lms/courses/all'); return data.data },
  })

  const { data: usersData } = useQuery({
    queryKey: ['available-users'],
    queryFn: async () => { const { data } = await api.get('/member-areas/users/available'); return data.data },
    enabled: enrollOpen,
  })

  const enrollMut = useMutation({
    mutationFn: async () => {
      await api.post('/lms/enroll/student', { courseId: selectedCourse, userId: selectedUser })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lms-enrollments'] })
      toast({ title: 'Siswa berhasil didaftarkan' })
      setEnrollOpen(false)
      setSelectedCourse('')
      setSelectedUser('')
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const unenrollMut = useMutation({
    mutationFn: (id: string) => api.delete(`/lms/enrollments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lms-enrollments'] })
      toast({ title: 'Siswa berhasil dihapus' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const enrollments = data?.data || []
  const pagination = data?.pagination
  const courses = coursesData || []

  return (
    <div className="min-h-screen">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-semibold text-slate-800">Enrollment Siswa</h2>
          </div>
          <Button className="gap-2 h-9 text-xs font-medium" onClick={() => setEnrollOpen(true)}>
            <UserCheck className="h-3.5 w-3.5" /> Daftarkan Siswa
          </Button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <Select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1) }} className="text-xs w-48">
            <option value="">Semua Course</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="text-xs w-36">
            <option value="">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="SELESAI">Selesai</option>
            <option value="KELUAR">Keluar</option>
          </Select>
          <span className="text-xs text-slate-400 ml-auto">Total {pagination?.total || 0}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Siswa</span></th>
                <th className="px-4 py-3 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"><BookOpen className="h-3 w-3 inline mr-1" /> Course</span></th>
                <th className="px-4 py-3 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Teacher</span></th>
                <th className="px-4 py-3 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</span></th>
                <th className="px-4 py-3 text-left border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tanggal Daftar</span></th>
                <th className="px-4 py-3 text-right border border-slate-100 bg-slate-50/50"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-24" /></td>)}</tr>
              ))}
              {enrollments.map((enr: any) => (
                <tr key={enr.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded bg-[#009ce1]/10 flex items-center justify-center text-[10px] font-bold text-[#009ce1]">
                        {enr.user?.candidate?.fullName?.[0] || enr.user?.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-slate-700">{enr.user?.candidate?.fullName || enr.user?.email}</span>
                        <span className="text-[10px] text-slate-400 block">{enr.user?.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border border-slate-100">{enr.course?.title}</td>
                  <td className="px-4 py-3 border border-slate-100">{enr.teacher?.email || <span className="text-slate-400 italic">-</span>}</td>
                  <td className="px-4 py-3 border border-slate-100">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                      enr.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700' :
                      enr.status === 'SELESAI' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                    }`}>{enr.status}</span>
                  </td>
                  <td className="px-4 py-3 border border-slate-100 text-xs text-slate-500">{formatDate(enr.enrolledAt)}</td>
                  <td className="px-4 py-3 text-right border border-slate-100">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={() => { if (confirm('Hapus enrollment ini?')) unenrollMut.mutate(enr.id) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && !enrollments.length && (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-xs text-slate-400">Belum ada enrollment</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Total {pagination.total}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 rounded text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <span className="text-xs font-semibold bg-slate-50 h-7 w-10 flex items-center justify-center rounded border">{page}</span>
              <Button size="sm" variant="outline" className="h-7 rounded text-xs" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </div>

      {enrollOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEnrollOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold mb-4">Daftarkan Siswa ke Course</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Pilih Course</Label>
                <Select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="text-xs">
                  <option value="">-- Pilih Course --</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pilih User</Label>
                <Select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="text-xs">
                  <option value="">-- Pilih User --</option>
                  {(usersData || []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="text-xs" onClick={() => setEnrollOpen(false)}>Batal</Button>
              <Button className="text-xs" onClick={() => enrollMut.mutate()} disabled={!selectedCourse || !selectedUser}>
                Daftarkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
