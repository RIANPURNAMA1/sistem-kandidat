import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Loader2, CheckCircle, Clock, ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

export default function CandidateLMS() {
  const queryClient = useQueryClient()

  const { data: myEnrollments, isLoading: enrollLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const { data } = await api.get('/lms/my-enrollments')
      return data.data
    },
  })

  const { data: allCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['all-courses'],
    queryFn: async () => {
      const { data } = await api.get('/lms/courses/all')
      return data.data
    },
  })

  const enrollMut = useMutation({
    mutationFn: async (courseId: string) => {
      await api.post('/lms/enroll', { courseId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      toast({ title: 'Berhasil mendaftar course' })
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const enrolledCourseIds = new Set(myEnrollments?.map((e: any) => e.course?.id) || [])
  const isLoading = enrollLoading || coursesLoading

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-[#009ce1]" /></div>

  const activeEnrollments = myEnrollments?.filter((e: any) => e.status === 'AKTIF') || []
  const completedEnrollments = myEnrollments?.filter((e: any) => e.status === 'SELESAI') || []

  return (
    <div className="min-h-screen space-y-6">
      <div className="bg-[#009ce1] rounded-sm p-6 text-white">
        <h1 className="text-sm font-bold">Learning Management System</h1>
        <p className="text-blue-200 text-xs mt-1">Akses materi pembelajaran dan tugas Anda di sini</p>
      </div>

      {/* Active Courses */}
      {activeEnrollments.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold mb-3">Course Aktif</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEnrollments.map((enr: any) => (
              <div key={enr.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden hover:shadow-md transition-shadow">
                {enr.course?.coverUrl ? (
                  <img src={enr.course.coverUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="h-32 bg-gradient-to-br from-[#009ce1] to-blue-800 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-white/40" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-xs font-bold">{enr.course?.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">{enr.course?._count?.modules || 0} modul</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <Clock className="h-3 w-3" /> Terdaftar sejak {new Date(enr.enrolledAt).toLocaleDateString('id-ID')}
                  </div>
                  <Link to={`/candidate/lms/${enr.course?.id}`}>
                    <Button size="sm" className="w-full text-xs">
                      <Play className="h-3 w-3 mr-1" /> Mulai Belajar
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedEnrollments.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold mb-3">Course Selesai</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedEnrollments.map((enr: any) => (
              <div key={enr.id} className="bg-white border border-emerald-200 rounded-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold">{enr.course?.title}</h3>
                    <p className="text-[10px] text-emerald-600">Selesai</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Courses - Available to Enroll */}
      <div>
        <h2 className="text-xs font-semibold mb-3">Semua Course</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(allCourses || []).map((course: any) => {
            const isEnrolled = enrolledCourseIds.has(course.id)
            return (
              <div key={course.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden hover:shadow-md transition-shadow">
                {course.coverUrl ? (
                  <img src={course.coverUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-xs font-bold">{course.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{course.description || ''}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {course._count?.modules || 0} modul</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {course._count?.enrollments || 0} siswa</span>
                  </div>
                  {isEnrolled ? (
                    <Link to={`/candidate/lms/${course.id}`}>
                      <Button size="sm" className="w-full text-xs">
                        <Play className="h-3 w-3 mr-1" /> Lanjutkan
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full text-xs"
                      onClick={() => enrollMut.mutate(course.id)}>
                      <ArrowRight className="h-3 w-3 mr-1" /> Daftar Course
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
          {(!allCourses || !allCourses.length) && (
            <div className="col-span-full text-center py-14 text-xs text-slate-400">
              Belum ada course tersedia
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
