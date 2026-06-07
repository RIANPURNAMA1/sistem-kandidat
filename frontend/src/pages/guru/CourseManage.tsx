import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Users, FileText, Award, Loader2, ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label, Textarea, Input } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

function GradeModal({ submission, onClose }: { submission: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [score, setScore] = useState(submission?.score || '')
  const [feedback, setFeedback] = useState(submission?.feedback || '')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await api.put(`/lms/submissions/${submission.id}/grade`, { score: parseInt(score), feedback })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru-course-manage'] })
      toast({ title: 'Nilai berhasil diberikan' })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-1">Beri Nilai</h2>
        <p className="text-xs text-slate-400 mb-4">
          {submission?.enrollment?.user?.candidate?.fullName || submission?.enrollment?.user?.email} &middot; {submission?.assignment?.title}
        </p>

        {submission?.content && (
          <div className="mb-4 p-3 bg-slate-50 rounded text-xs text-slate-600 max-h-32 overflow-y-auto">
            {submission.content}
          </div>
        )}
        {submission?.fileUrl && (
          <a href={submission.fileUrl} target="_blank" className="text-xs text-[#009ce1] underline block mb-4">
            Lihat File Tugas
          </a>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nilai (max {submission?.assignment?.maxScore || 100})</Label>
            <Input type="number" value={score} onChange={e => setScore(e.target.value)} className="text-xs" max={submission?.assignment?.maxScore || 100} />
          </div>
          <div>
            <Label className="text-xs">Feedback</Label>
            <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="text-xs" rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button className="text-xs" onClick={() => mutate()} disabled={isPending || !score}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Nilai'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function GuruCourseManage() {
  const { id } = useParams()
  const [expandedAs, setExpandedAs] = useState<Set<string>>(new Set())
  const [gradeTarget, setGradeTarget] = useState<any>(null)

  const { data: enrollment, isLoading } = useQuery({
    queryKey: ['guru-course-manage', id],
    queryFn: async () => {
      const { data } = await api.get(`/lms/courses/${id}`)
      return data.data
    },
    enabled: !!id,
  })

  const { data: submissionsData } = useQuery({
    queryKey: ['guru-submissions', id],
    queryFn: async () => {
      const { data } = await api.get('/lms/submissions')
      return data.data
    },
  })

  const toggleAs = (asId: string) => {
    setExpandedAs(prev => {
      const next = new Set(prev)
      if (next.has(asId)) next.delete(asId)
      else next.add(asId)
      return next
    })
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!enrollment) return <div className="text-center py-14 text-xs text-slate-400">Course tidak ditemukan</div>

  const submissions = submissionsData?.filter((s: any) => {
    const mod = enrollment?.modules?.find((m: any) => m.assignments?.some((a: any) => a.id === s.assignmentId))
    return !!mod
  }) || []

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/guru/courses" className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-bold">{enrollment.title}</h1>
          <p className="text-xs text-slate-400">{enrollment._count?.modules} modul &middot; {enrollment._count?.enrollments} siswa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Structure */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-semibold">Struktur Course</h2>
          {enrollment.modules?.map((mod: any) => (
            <div key={mod.id} className="bg-white border border-slate-200 rounded-sm">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#009ce1]" />
                  <span className="text-xs font-semibold">Modul {mod.order}: {mod.title}</span>
                </div>
                {mod.description && <p className="text-[10px] text-slate-400 mt-1 ml-6">{mod.description}</p>}
              </div>

              {/* Lessons */}
              <div className="divide-y divide-slate-50">
                {mod.lessons?.map((lesson: any) => (
                  <div key={lesson.id} className="flex items-center gap-2 px-6 py-2.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs">{lesson.order}. {lesson.title}</span>
                    {lesson.duration && <span className="text-[10px] text-slate-400">({lesson.duration}m)</span>}
                  </div>
                ))}
              </div>

              {/* Assignments */}
              {mod.assignments?.map((as: any) => (
                <div key={as.id} className="border-t border-slate-100">
                  <div className="flex items-center justify-between px-6 py-2.5 cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleAs(as.id)}>
                    <div className="flex items-center gap-2">
                      {expandedAs.has(as.id) ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-medium">{as.title}</span>
                      <span className="text-[10px] text-slate-400">(Max: {as.maxScore})</span>
                      {as.dueDate && <span className="text-[10px] text-slate-400"><Calendar className="h-3 w-3 inline" /> {formatDate(as.dueDate)}</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">{as._count?.submissions || 0} submissions</span>
                  </div>

                  {expandedAs.has(as.id) && (
                    <div className="px-8 py-2 bg-slate-50/50 space-y-1 max-h-64 overflow-y-auto">
                      {submissions?.filter((s: any) => s.assignmentId === as.id).length === 0 && (
                        <p className="text-[10px] text-slate-400 italic py-2">Belum ada submission</p>
                      )}
                      {submissions?.filter((s: any) => s.assignmentId === as.id).map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">
                              {sub.enrollment?.user?.candidate?.fullName?.[0] || sub.enrollment?.user?.email?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <span className="text-[11px] font-medium">{sub.enrollment?.user?.candidate?.fullName || sub.enrollment?.user?.email}</span>
                              <span className={`text-[10px] ml-2 ${
                                sub.status === 'DINILAI' ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {sub.status === 'DINILAI' ? `Nilai: ${sub.score}/${as.maxScore}` : 'Belum dinilai'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.fileUrl && (
                              <a href={sub.fileUrl} target="_blank" className="text-[10px] text-[#009ce1] underline">File</a>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                              onClick={() => setGradeTarget(sub)}>
                              {sub.status === 'DINILAI' ? 'Edit Nilai' : 'Beri Nilai'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-[#009ce1]" /> Siswa Terdaftar</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {Array.isArray(enrollment?.enrollments) && enrollment.enrollments.map((enr: any) => (
                <div key={enr.id} className="flex items-center gap-2 py-1.5">
                  <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">
                    {enr.user?.candidate?.fullName?.[0] || enr.user?.email?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[11px]">{enr.user?.candidate?.fullName || enr.user?.email}</span>
                </div>
              ))}
              {(!enrollment?.enrollments || !enrollment.enrollments.length) && (
                <p className="text-[10px] text-slate-400 italic">Belum ada siswa</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm p-4">
            <h3 className="text-xs font-semibold mb-2">Ringkasan Penilaian</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Submission</span>
                <span className="font-semibold">{submissions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sudah Dinilai</span>
                <span className="font-semibold text-emerald-600">{submissions.filter((s: any) => s.status === 'DINILAI').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Belum Dinilai</span>
                <span className="font-semibold text-amber-600">{submissions.filter((s: any) => s.status === 'MENUNGGU_DINILAI').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {gradeTarget && (
        <GradeModal submission={gradeTarget} onClose={() => setGradeTarget(null)} />
      )}
    </div>
  )
}
