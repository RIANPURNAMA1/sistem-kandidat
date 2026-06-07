import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/services/api'

export default function GuruCourses() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['guru-courses'],
    queryFn: async () => {
      const { data } = await api.get('/lms/courses/all')
      return data.data
    },
  })

  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const { data } = await api.get('/lms/my-enrollments')
      return data.data
    },
  })

  const enrolledIds = new Set(enrollments?.map((e: any) => e.course?.id) || [])

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-[#009ce1]" /></div>

  return (
    <div className="min-h-screen space-y-6">
      <div>
        <h1 className="text-sm font-bold">Daftar Course</h1>
        <p className="text-xs text-slate-400 mt-1">Kelola course yang Anda ajar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(courses || []).map((course: any) => {
          const isEnrolled = enrolledIds.has(course.id)
          return (
            <div key={course.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden hover:shadow-md transition-shadow">
              {course.coverUrl ? (
                <img src={course.coverUrl} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="h-36 bg-gradient-to-br from-[#009ce1] to-blue-800 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-white/40" />
                </div>
              )}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold">{course.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{course.description || 'Tidak ada deskripsi'}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {course._count?.modules || 0} modul</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {course._count?.enrollments || 0} siswa</span>
                </div>
                <Link to={isEnrolled ? `/guru/courses/${course.id}/manage` : '#'}>
                  <Button size="sm" className="w-full text-xs" variant={isEnrolled ? 'default' : 'outline'} disabled={!isEnrolled}>
                    {isEnrolled ? <>Kelola <ArrowRight className="h-3 w-3 ml-1" /></> : 'Belum Terdaftar'}
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
        {(!courses || !courses.length) && (
          <div className="col-span-full text-center py-14 text-xs text-slate-400">
            Belum ada course tersedia
          </div>
        )}
      </div>
    </div>
  )
}
