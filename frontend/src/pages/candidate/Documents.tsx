import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, CheckCircle, XCircle, Clock, Download, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Select, Label } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import api from '@/services/api'

const DOC_TYPES = ['KTP','KK','PASPOR','IJAZAH','CV','SERTIFIKAT','LAINNYA']

export default function CandidateDocuments() {
  const [docType, setDocType] = useState('KTP')
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: docs, isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => { const { data } = await api.get('/documents/my'); return data.data },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData(); fd.append('file', file); fd.append('type', docType)
      return api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { toast({ title: 'Dokumen berhasil diupload!' }); qc.invalidateQueries({ queryKey: ['my-documents'] }); if (fileRef.current) fileRef.current.value = '' },
    onError: (err: any) => toast({ title: 'Upload gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => { toast({ title: 'Dokumen dihapus' }); qc.invalidateQueries({ queryKey: ['my-documents'] }) },
  })

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'VERIFIED') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-500" />
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dokumen Saya</h1>
        <p className="text-sm text-slate-500">Upload dan kelola dokumen persyaratan Anda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Required docs checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Checklist Dokumen Wajib</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['KTP','KK','PASPOR','IJAZAH'].map(type => {
                const uploaded = docs?.find((d: any) => d.type === type)
                return (
                  <div key={type} className={cn(
                    "p-3 rounded-xl border text-center transition-all",
                    uploaded ? 'border-emerald-200 bg-emerald-50/50' : 'border-dashed border-slate-200 bg-slate-50/50 opacity-60'
                  )}>
                    {uploaded ? <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-2" /> : <Clock className="h-5 w-5 text-slate-300 mx-auto mb-2" />}
                    <p className="text-xs font-bold text-slate-700">{type}</p>
                    <p className="text-[9px] font-bold uppercase tracking-tighter mt-0.5 text-slate-400">{uploaded ? 'Terupload' : 'Belum'}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Documents table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4 text-left border border-slate-200">Jenis Dokumen</th>
                  <th className="px-6 py-4 text-left border border-slate-200">Nama File</th>
                  <th className="px-6 py-4 text-left border border-slate-200">Status</th>
                  <th className="px-6 py-4 text-left border border-slate-200">Tanggal</th>
                  <th className="px-6 py-4 text-right border border-slate-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && [...Array(4)].map((_,i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(5)].map((_,j) => <td key={j} className="px-6 py-4 border border-slate-200"><div className="h-4 bg-slate-100 rounded w-full" /></td>)}
                  </tr>
                ))}
                {!isLoading && docs?.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-slate-400 py-16 font-medium italic border border-slate-200">Belum ada dokumen yang diupload.</td></tr>
                )}
                {docs?.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-fb-blue/5 flex items-center justify-center text-fb-blue border border-fb-blue/10">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-900">{doc.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 border border-slate-200 truncate max-w-[150px]" title={doc.fileName}>{doc.fileName}</td>
                    <td className="px-6 py-4 border border-slate-200">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                        {doc.adminNotes && <p className="text-[9px] text-red-500 font-medium leading-tight">Catatan: {doc.adminNotes}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 border border-slate-200 font-mono text-[10px]">{formatDate(doc.createdAt)}</td>
                    <td className="px-6 py-4 text-right border border-slate-200">
                      <div className="flex justify-end gap-1">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-slate-100"><Download className="h-4 w-4 text-slate-400 hover:text-slate-900" /></Button>
                        </a>
                        {doc.status === 'PENDING' && (
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(doc.id)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-fit">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
            <h3 className="font-bold text-sm text-slate-900">Upload Dokumen Baru</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Jenis Dokumen</Label>
              <Select value={docType} onChange={e => setDocType(e.target.value)} className="w-full rounded-xl border-slate-200">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">File Dokumen</Label>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={e => { if (e.target.files?.[0]) uploadMutation.mutate(e.target.files[0]) }} />
              <button 
                onClick={() => fileRef.current?.click()} 
                disabled={uploadMutation.isPending}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-fb-blue/40 transition-all group"
              >
                <div className="h-12 w-12 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-slate-400 group-hover:text-fb-blue transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">{uploadMutation.isPending ? 'Sedang Mengupload...' : 'Pilih File'}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">JPG, PNG, PDF (Maks. 5MB)</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
