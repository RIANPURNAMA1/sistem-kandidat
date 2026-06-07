import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Loader2, ArrowLeft, BookOpen, ChevronDown, ChevronRight, FileText, Video, Link2, Calendar, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

function ModuleForm({ courseId, module, onClose }: { courseId: string; module?: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isEdit = !!module
  const [title, setTitle] = useState(module?.title || '')
  const [description, setDescription] = useState(module?.description || '')
  const [order, setOrder] = useState(module?.order || '')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (isEdit) await api.put(`/lms/modules/${module.id}`, { title, description, order: order ? parseInt(order) : undefined })
      else await api.post(`/lms/courses/${courseId}/modules`, { title, description })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail', courseId] })
      toast({ title: isEdit ? 'Modul diperbarui' : 'Modul berhasil dibuat' })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-4">{isEdit ? 'Edit Modul' : 'Tambah Modul Baru'}</h2>
        <div className="space-y-3">
          <div><Label className="text-xs">Judul Modul</Label><Input required value={title} onChange={e => setTitle(e.target.value)} className="text-xs" /></div>
          <div><Label className="text-xs">Deskripsi</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="text-xs" rows={3} /></div>
          {isEdit && <div><Label className="text-xs">Urutan</Label><Input type="number" value={order} onChange={e => setOrder(e.target.value)} className="text-xs" /></div>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button className="text-xs" onClick={() => mutate()} disabled={isPending || !title}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LessonForm({ moduleId, lesson, onClose }: { moduleId: string; lesson?: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isEdit = !!lesson
  const [title, setTitle] = useState(lesson?.title || '')
  const [content, setContent] = useState(lesson?.content || '')
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '')
  const [duration, setDuration] = useState(lesson?.duration || '')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (isEdit) await api.put(`/lms/lessons/${lesson.id}`, { title, content, videoUrl, duration: duration ? parseInt(duration) : null })
      else await api.post(`/lms/modules/${moduleId}/lessons`, { title, content, videoUrl, duration: duration ? parseInt(duration) : null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail'] })
      toast({ title: isEdit ? 'Lesson diperbarui' : 'Lesson berhasil dibuat' })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-4">{isEdit ? 'Edit Lesson' : 'Tambah Lesson Baru'}</h2>
        <div className="space-y-3">
          <div><Label className="text-xs">Judul Lesson</Label><Input required value={title} onChange={e => setTitle(e.target.value)} className="text-xs" /></div>
          <div><Label className="text-xs">Konten (HTML/Text)</Label><Textarea value={content} onChange={e => setContent(e.target.value)} className="text-xs" rows={6} /></div>
          <div><Label className="text-xs">URL Video (YouTube Embed)</Label><Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="text-xs" placeholder="https://www.youtube.com/embed/..." /></div>
          <div><Label className="text-xs">Durasi (menit)</Label><Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="text-xs" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button className="text-xs" onClick={() => mutate()} disabled={isPending || !title}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MaterialForm({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileType, setFileType] = useState('FILE')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await api.post(`/lms/lessons/${lessonId}/materials`, { title, fileUrl, fileType })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail'] })
      toast({ title: 'Material berhasil ditambahkan' })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-4">Tambah Material</h2>
        <div className="space-y-3">
          <div><Label className="text-xs">Judul Material</Label><Input required value={title} onChange={e => setTitle(e.target.value)} className="text-xs" /></div>
          <div><Label className="text-xs">URL File</Label><Input required value={fileUrl} onChange={e => setFileUrl(e.target.value)} className="text-xs" placeholder="https://..." /></div>
          <div><Label className="text-xs">Tipe</Label>
            <Select value={fileType} onChange={e => setFileType(e.target.value)} className="text-xs">
              <option value="FILE">File</option>
              <option value="VIDEO">Video</option>
              <option value="LINK">Link</option>
              <option value="EMBED">Embed</option>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button className="text-xs" onClick={() => mutate()} disabled={isPending || !title || !fileUrl}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function AssignmentForm({ moduleId, assignment, onClose }: { moduleId: string; assignment?: any; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isEdit = !!assignment
  const [title, setTitle] = useState(assignment?.title || '')
  const [description, setDescription] = useState(assignment?.description || '')
  const [maxScore, setMaxScore] = useState(assignment?.maxScore || 100)
  const [dueDate, setDueDate] = useState(assignment?.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '')

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const payload: any = { title, description, maxScore: parseInt(maxScore) }
      if (dueDate) payload.dueDate = new Date(dueDate).toISOString()
      if (isEdit) await api.put(`/lms/assignments/${assignment.id}`, payload)
      else await api.post(`/lms/modules/${moduleId}/assignments`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail'] })
      toast({ title: isEdit ? 'Tugas diperbarui' : 'Tugas berhasil dibuat' })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold mb-4">{isEdit ? 'Edit Tugas' : 'Tambah Tugas Baru'}</h2>
        <div className="space-y-3">
          <div><Label className="text-xs">Judul Tugas</Label><Input required value={title} onChange={e => setTitle(e.target.value)} className="text-xs" /></div>
          <div><Label className="text-xs">Deskripsi</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="text-xs" rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Nilai Maksimal</Label><Input type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)} className="text-xs" /></div>
            <div><Label className="text-xs">Tenggat Waktu</Label><Input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-xs" /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button className="text-xs" onClick={() => mutate()} disabled={isPending || !title}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLMSCourseDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())

  const [moduleForm, setModuleForm] = useState<{ open: boolean; module?: any }>({ open: false })
  const [lessonForm, setLessonForm] = useState<{ open: boolean; moduleId?: string; lesson?: any }>({ open: false })
  const [materialForm, setMaterialForm] = useState<{ open: boolean; lessonId?: string }>({ open: false })
  const [assignmentForm, setAssignmentForm] = useState<{ open: boolean; moduleId?: string; assignment?: any }>({ open: false })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-course-detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/lms/courses/${id}`)
      return data.data
    },
    enabled: !!id,
  })

  const deleteModuleMut = useMutation({
    mutationFn: (moduleId: string) => api.delete(`/lms/modules/${moduleId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-course-detail', id] }); toast({ title: 'Modul berhasil dihapus' }) },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const deleteLessonMut = useMutation({
    mutationFn: (lessonId: string) => api.delete(`/lms/lessons/${lessonId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-course-detail', id] }); toast({ title: 'Lesson berhasil dihapus' }) },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const deleteAssignmentMut = useMutation({
    mutationFn: (assignmentId: string) => api.delete(`/lms/assignments/${assignmentId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-course-detail', id] }); toast({ title: 'Tugas berhasil dihapus' }) },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const deleteMaterialMut = useMutation({
    mutationFn: (materialId: string) => api.delete(`/lms/materials/${materialId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-course-detail', id] }); toast({ title: 'Material berhasil dihapus' }) },
    onError: (err: any) => toast({ title: 'Gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const toggleModule = (mid: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(mid)) next.delete(mid)
      else next.add(mid)
      return next
    })
  }

  const toggleLesson = (lid: string) => {
    setExpandedLessons(prev => {
      const next = new Set(prev)
      if (next.has(lid)) next.delete(lid)
      else next.add(lid)
      return next
    })
  }

  const course = data

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-[#009ce1]" /></div>
  if (!course) return <div className="text-center py-14 text-xs text-slate-400">Course tidak ditemukan</div>

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/lms" className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-bold">{course.title}</h1>
          <p className="text-xs text-slate-400">/{course.slug} &middot; {course._count?.modules || 0} modul &middot; {course._count?.enrollments || 0} siswa</p>
        </div>
      </div>

      {course.description && (
        <div className="bg-white border border-slate-200 rounded-sm p-4">
          <p className="text-xs text-slate-600">{course.description}</p>
        </div>
      )}

      <div className="space-y-4">
        {course.modules?.map((mod: any) => (
          <div key={mod.id} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50" onClick={() => toggleModule(mod.id)}>
              <div className="flex items-center gap-2">
                {expandedModules.has(mod.id) ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <BookOpen className="h-4 w-4 text-[#009ce1]" />
                <span className="text-xs font-semibold">Modul {mod.order}: {mod.title}</span>
                <span className="text-[10px] text-slate-400">({mod._count?.lessons || 0} lesson, {mod._count?.assignments || 0} tugas)</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#009ce1]" onClick={e => { e.stopPropagation(); setLessonForm({ open: true, moduleId: mod.id }) }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-[#009ce1]" onClick={e => { e.stopPropagation(); setAssignmentForm({ open: true, moduleId: mod.id }) }}>
                  <Award className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-500" onClick={e => { e.stopPropagation(); setModuleForm({ open: true, module: mod }) }}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={e => { e.stopPropagation(); if (confirm('Hapus modul ini?')) deleteModuleMut.mutate(mod.id) }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {expandedModules.has(mod.id) && (
              <div className="border-t border-slate-100">
                {/* Lessons */}
                {mod.lessons?.map((lesson: any) => (
                  <div key={lesson.id}>
                    <div className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50" onClick={() => toggleLesson(lesson.id)}>
                      <div className="flex items-center gap-2">
                        {expandedLessons.has(lesson.id) ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs">{lesson.order}. {lesson.title}</span>
                        {lesson.duration && <span className="text-[10px] text-slate-400">({lesson.duration} menit)</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-[#009ce1]"
                          onClick={e => { e.stopPropagation(); setMaterialForm({ open: true, lessonId: lesson.id }) }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-amber-500"
                          onClick={e => { e.stopPropagation(); setLessonForm({ open: true, moduleId: mod.id, lesson }) }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-red-500"
                          onClick={e => { e.stopPropagation(); if (confirm('Hapus lesson ini?')) deleteLessonMut.mutate(lesson.id) }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {expandedLessons.has(lesson.id) && (
                      <div className="px-10 py-2 bg-slate-50/50 space-y-1">
                        {lesson.materials?.map((mat: any) => (
                          <div key={mat.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              {mat.fileType === 'VIDEO' ? <Video className="h-3 w-3 text-blue-500" /> :
                               mat.fileType === 'LINK' ? <Link2 className="h-3 w-3 text-green-500" /> :
                               <FileText className="h-3 w-3 text-slate-500" />}
                              <span className="text-[11px]">{mat.title}</span>
                              <span className="text-[10px] text-slate-400">({mat.fileType})</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-5 w-5 text-slate-400 hover:text-red-500"
                              onClick={() => { if (confirm('Hapus material?')) deleteMaterialMut.mutate(mat.id) }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {(!lesson.materials || !lesson.materials.length) && (
                          <p className="text-[10px] text-slate-400 italic py-1">Belum ada material</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {(!mod.lessons || !mod.lessons.length) && (
                  <div className="px-6 py-3 text-center text-[10px] text-slate-400 italic">Belum ada lesson</div>
                )}

                {/* Assignments */}
                {mod.assignments?.map((as: any) => (
                  <div key={as.id} className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-medium">{as.title}</span>
                      <span className="text-[10px] text-slate-400">(Max: {as.maxScore})</span>
                      {as.dueDate && <span className="text-[10px] text-slate-400"><Calendar className="h-3 w-3 inline" /> {formatDate(as.dueDate)}</span>}
                      <span className="text-[10px] text-slate-400">{as._count?.submissions || 0} submissions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-amber-500"
                        onClick={() => setAssignmentForm({ open: true, moduleId: mod.id, assignment: as })}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-red-500"
                        onClick={() => { if (confirm('Hapus tugas ini?')) deleteAssignmentMut.mutate(as.id) }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button className="text-xs" onClick={() => setModuleForm({ open: true })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Modul
        </Button>
      </div>

      {moduleForm.open && <ModuleForm courseId={id!} module={moduleForm.module} onClose={() => setModuleForm({ open: false })} />}
      {lessonForm.open && <LessonForm moduleId={lessonForm.moduleId!} lesson={lessonForm.lesson} onClose={() => setLessonForm({ open: false })} />}
      {materialForm.open && <MaterialForm lessonId={materialForm.lessonId!} onClose={() => setMaterialForm({ open: false })} />}
      {assignmentForm.open && <AssignmentForm moduleId={assignmentForm.moduleId!} assignment={assignmentForm.assignment} onClose={() => setAssignmentForm({ open: false })} />}
    </div>
  )
}
