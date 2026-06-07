import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Clock, GraduationCap } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'

export default function GuruDashboard() {
  const { user } = useAuthStore()
  const { data: dashboard } = useQuery({
    queryKey: ['guru-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/lms/guru/dashboard')
      return data.data
    },
  })

  const stats = [
    { label: 'Total Siswa Bimbingan', value: dashboard?.totalStudents || 0, icon: Users, color: 'text-blue-600 bg-blue-100' },
    { label: 'Menunggu Penilaian', value: dashboard?.pendingGrading || 0, icon: Clock, color: 'text-amber-600 bg-amber-100' },
    { label: 'Course Saya', value: dashboard?.myCourses?.length || 0, icon: BookOpen, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Total Enrollment', value: dashboard?.teachingEnrollments?.length || 0, icon: GraduationCap, color: 'text-purple-600 bg-purple-100' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-[#009ce1] rounded-sm p-6 text-white">
        <h1 className="text-sm font-bold">Selamat datang, Guru {user?.email?.split('@')[0]}</h1>
        <p className="text-blue-200 text-xs mt-1">Kelola course, materi, dan nilai siswa di sini</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-sm flex items-center justify-center ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xs font-semibold">Course Saya</h2>
            <Link to="/guru/courses" className="text-[10px] text-[#009ce1] font-medium">Lihat Semua</Link>
          </div>
          <div className="p-4 space-y-2">
            {dashboard?.myCourses?.slice(0, 5).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <BookOpen className="h-4 w-4 text-[#009ce1]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.course?.title}</p>
                  <p className="text-[10px] text-slate-400">{item.status}</p>
                </div>
              </div>
            ))}
            {(!dashboard?.myCourses || !dashboard?.myCourses.length) && (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada course</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-xs font-semibold">Siswa Bimbingan</h2>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {dashboard?.teachingEnrollments?.slice(0, 10).map((enr: any) => (
              <div key={enr.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="h-7 w-7 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {enr.user?.candidate?.fullName?.[0] || enr.user?.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{enr.user?.candidate?.fullName || enr.user?.email}</p>
                  <p className="text-[10px] text-slate-400">{enr.course?.title}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  enr.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>{enr.status}</span>
              </div>
            ))}
            {(!dashboard?.teachingEnrollments || !dashboard?.teachingEnrollments.length) && (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada siswa bimbingan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
