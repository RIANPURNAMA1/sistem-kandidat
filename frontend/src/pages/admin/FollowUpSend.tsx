import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Search, Loader2, Send, MessageSquare } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'
import { useSearchParams } from 'react-router-dom'

interface Candidate {
  id: string
  fullName: string
  nik: string
  phone: string
  applications: { program: { name: string }; status: string }[]
  user: { isActive: boolean }
}

interface Template {
  id: string
  name: string
  message: string
  channel: string
  category: { id: string; name: string; color: string | null }
  isActive: boolean
}

export default function AdminFollowUpSend() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectedTemplate = searchParams.get('template') || ''

  const [selectedTemplate, setSelectedTemplate] = useState(preselectedTemplate)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [previewMessage, setPreviewMessage] = useState('')

  const { data: templates } = useQuery({
    queryKey: ['follow-up-templates-all'],
    queryFn: async () => {
      const { data } = await api.get('/follow-ups/templates')
      return data.data as Template[]
    },
  })

  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    queryKey: ['candidates-for-followup', candidateSearch],
    queryFn: async () => {
      const { data } = await api.get('/candidates', {
        params: { search: candidateSearch || undefined, limit: 200 },
      })
      return (data.data?.items || data.data || []) as Candidate[]
    },
  })

  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate)

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (!candidates) return
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(candidates.map(c => c.id))
    }
    setSelectAll(!selectAll)
  }

  function generatePreview(name: string, message: string) {
    return message.replace(/{nama}/g, name).replace(/{program}/g, '[Nama Program]').replace(/{nik}/g, '[NIK]')
  }

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/follow-ups/send', {
        templateId: selectedTemplate,
        candidateIds: selectedIds,
      })
      return data
    },
    onSuccess: (res) => {
      toast({ title: 'Follow-up berhasil dikirim!', description: `Terkirim ke ${res.data?.total || 0} kandidat` })
      queryClient.invalidateQueries({ queryKey: ['follow-up-templates-all'] })
      setSelectedIds([])
      setSelectAll(false)
    },
    onError: (err: any) => toast({ title: 'Gagal mengirim', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Kirim Follow-Up</h1>
        <p className="text-sm text-muted-foreground">Kirim pesan follow-up ke kandidat via WhatsApp</p>
      </div>

      {!selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pilih Template</CardTitle>
            <CardDescription>Pilih template follow-up yang akan dikirim</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates?.filter(t => t.isActive).map(tpl => (
                <Card
                  key={tpl.id}
                  className="cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                  onClick={() => { setSelectedTemplate(tpl.id); setPreviewMessage(generatePreview('[Nama Kandidat]', tpl.message)) }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold text-sm">{tpl.name}</span>
                    </div>
                    {tpl.category && (
                      <Badge className="text-xs" style={{ backgroundColor: tpl.category.color || '#6366f1', color: '#fff' }}>
                        {tpl.category.name}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{tpl.message}</p>
                  </CardContent>
                </Card>
              ))}
              {(!templates || templates.filter(t => t.isActive).length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground">Tidak ada template aktif. Buat template terlebih dahulu.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTemplate && selectedTemplateData && (
        <>
          {/* Template Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selectedTemplateData.name}</CardTitle>
                  <CardDescription>
                    {selectedTemplateData.category?.name} &middot; {selectedTemplateData.channel}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedTemplate(''); setSelectedIds([]); setSelectAll(false) }}>
                  Ganti Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm font-medium mb-1">Pratinjau Pesan:</p>
                <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
              </div>
            </CardContent>
          </Card>

          {/* Pilih Kandidat */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilih Kandidat</CardTitle>
              <CardDescription>
                {selectedIds.length} kandidat dipilih
                {selectedIds.length > 0 && (
                  <Button variant="link" size="sm" className="h-auto p-0 ml-2 text-xs" onClick={() => { setSelectedIds([]); setSelectAll(false) }}>
                    Hapus pilihan
                  </Button>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-72 mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                  placeholder="Cari kandidat..."
                  className="pl-8"
                />
              </div>

              {loadingCandidates ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" checked={selectAll} onChange={toggleAll} className="rounded" id="selectAll" />
                    <Label htmlFor="selectAll" className="mb-0 text-sm">Pilih semua ({candidates?.length || 0} kandidat)</Label>
                  </div>
                  <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                    {candidates?.map(c => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.includes(c.id) ? 'bg-indigo-50' : ''}`}
                        onClick={() => toggleSelect(c.id)}
                      >
                        <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.fullName}</p>
                          <p className="text-xs text-muted-foreground">{c.phone} &middot; {c.nik}</p>
                        </div>
                        {c.applications?.[0] && (
                          <Badge variant="outline" className="text-xs shrink-0">{c.applications[0].program.name}</Badge>
                        )}
                      </div>
                    ))}
                    {(!candidates || candidates.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada kandidat ditemukan</div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              className="gap-2"
              disabled={selectedIds.length === 0 || sendMutation.isPending}
              onClick={() => {
                if (confirm(`Kirim follow-up ke ${selectedIds.length} kandidat?`)) {
                  sendMutation.mutate()
                }
              }}
            >
              {sendMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Kirim ke {selectedIds.length} Kandidat
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
