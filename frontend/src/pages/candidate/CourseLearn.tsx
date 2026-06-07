import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, FileText, Award, ChevronDown, ChevronRight, Clock, Play, Loader2, Upload, ExternalLink, Video, Link2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label, Textarea, Input } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

export default function CandidateCourseLearn() {
  const { courseId } = useParams()
  const queryClient = useQueryClient()
  const [expandedMod, setExpandedMod] = useState<Set<string>>(new Set())
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [submitForm, setSubmitForm] = useState<{ open: boolean; assignmentId: string } | null>(null)
  const [submitContent, setSubmitContent] = useState('')
  const [submitFile, setSubmitFile] = useState('')

  const { data: enrollment, isLoading } = useQuery({
    queryKey: ['my-course-detail', courseId],
    queryFn: async () => {
      const { data } = await api.get(`/lms/my-enrollments/${courseId}`)
      return data.data
    },
    enabled: !!courseId,
  })

  const submitMut = useMutation({
    mutationFn: async () => {
      await api.post(`/lms/assignments/${submitForm?.assignmentId}/submit`, {
        content: submitContent,
        fileUrl: submitFile || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-course-detail', courseId] })
      toast({ title: 'Tugas berhasil dikumpulkan' })
      setSubmitForm(null)
      setSubmitContent('')
      setSubmitFile('')
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const toggleMod = (modId: string) => {
    setExpandedMod(prev => {
      const next = new Set(prev)
      if (next.has(modId)) next.delete(modId)
      else next.add(modId)
      return next
    })
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-[#009ce1]" /></div>
  if (!enrollment) return <div className="text-center py-14 text-xs text-slate-400">Course tidak ditemukan atau Anda belum terdaftar</div>

  const course = enrollment.course
  const modules = course?.modules || []

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/candidate/lms" className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-bold">{course?.title}</h1>
          <p className="text-xs text-slate-400">{modules.length} modul</p>
        </div>
      </div>

      {/* Video / Content Area */}
      {selectedLesson && (
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          {selectedLesson.videoUrl && (
            <div className="aspect-video bg-black">
              <iframe src={selectedLesson.videoUrl} className="w-full h-full" allowFullScreen title={selectedLesson.title} />
            </div>
          )}
          <div className="p-4 space-y-3">
            <h2 className="text-sm font-bold">{selectedLesson.order}. {selectedLesson.title}</h2>
            {selectedLesson.duration && (
              <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedLesson.duration} menit</p>
            )}
            {selectedLesson.content && (
              <div className="text-xs text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
            )}
            {selectedLesson.materials?.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold mb-2">Materi Pendukung</h3>
                <div className="space-y-2">
                  {selectedLesson.materials.map((mat: any) => (
                    <a key={mat.id} href={mat.fileUrl} target="_blank"
                      className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-xs text-[#009ce1]">
                      {mat.fileType === 'VIDEO' ? <Video className="h-3.5 w-3.5" /> :
                       mat.fileType === 'LINK' ? <Link2 className="h-3.5 w-3.5" /> :
                       <FileText className="h-3.5 w-3.5" />}
                      {mat.title}
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedLesson && (
        <div className="bg-white border border-slate-200 rounded-sm p-8 text-center">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Pilih lesson dari daftar modul di bawah untuk mulai belajar</p>
        </div>
      )}

      {/* Module List */}
      <div className="space-y-3">
        {modules.map((mod: any) => (
          <div key={mod.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleMod(mod.id)}>
              <div className="flex items-center gap-2">
                {expandedMod.has(mod.id) ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <BookOpen className="h-4 w-4 text-[#009ce1]" />
                <span className="text-xs font-semibold">Modul {mod.order}: {mod.title}</span>
                <span className="text-[10px] text-slate-400">({mod.lessons?.length || 0} lesson)</span>
              </div>
            </div>

            {expandedMod.has(mod.id) && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {/* Lessons */}
                {mod.lessons?.map((lesson: any) => (
                  <div key={lesson.id}
                    className={`flex items-center justify-between px-6 py-2.5 cursor-pointer hover:bg-slate-50
                      ${selectedLesson?.id === lesson.id ? 'bg-[#009ce1]/5' : ''}`}
                    onClick={() => setSelectedLesson(lesson)}>
                    <div className="flex items-center gap-2">
                      {selectedLesson?.id === lesson.id ? (
                        <Play className="h-3.5 w-3.5 text-[#009ce1]" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span className="text-xs">{lesson.order}. {lesson.title}</span>
                      {lesson.duration && <span className="text-[10px] text-slate-400">({lesson.duration}m)</span>}
                    </div>
                  </div>
                ))}

                {/* Assignments */}
                {mod.assignments?.map((as: any) => {
                  const mySub = as.submissions?.[0]
                  return (
                    <div key={as.id} className="flex items-center justify-between px-6 py-2.5 bg-amber-50/30">
                      <div className="flex items-center gap-2">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-medium">{as.title}</span>
                        <span className="text-[10px] text-slate-400">(Max: {as.maxScore})</span>
                        {as.dueDate && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(as.dueDate)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {mySub?.status === 'DINILAI' ? (
                          <span className="text-xs font-bold text-emerald-600">{mySub.score}/{as.maxScore}</span>
                        ) : mySub?.status === 'MENUNGGU_DINILAI' ? (
                          <span className="text-[10px] text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Menunggu dinilai</span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]"
                            onClick={() => setSubmitForm({ open: true, assignmentId: as.id })}>
                            <Upload className="h-3 w-3 mr-1" /> Kumpulkan
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Modal */}
      {submitForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSubmitForm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold mb-4">Kumpulkan Tugas</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Jawaban / Catatan</Label>
                <Textarea value={submitContent} onChange={e => setSubmitContent(e.target.value)} className="text-xs" rows={4} placeholder="Tulis jawaban atau catatan Anda..." />
              </div>
              <div>
                <Label className="text-xs">URL File Tugas (Google Drive, dll)</Label>
                <Input value={submitFile} onChange={e => setSubmitFile(e.target.value)} className="text-xs" placeholder="https://drive.google.com/..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="text-xs" onClick={() => setSubmitForm(null)}>Batal</Button>
              <Button className="text-xs" onClick={() => submitMut.mutate()} disabled={submitMut.isPending || (!submitContent && !submitFile)}>
                {submitMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengumpulkan...</> : 'Kumpulkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
