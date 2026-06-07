import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/index'
import { Loader2, Plus, Copy, CheckCircle, Trash2, ExternalLink, Users, Edit3, Eye, Search, UserCheck } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

interface Field {
  key: string
  label: string
  required: boolean
  enabled: boolean
}

const TEMPLATES = [
  { value: 'default', label: 'Default' },
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Klasik' },
]

const DEFAULT_REGISTER_FIELDS: Field[] = [
  { key: 'nik', label: 'NIK', required: true, enabled: true },
  { key: 'fullName', label: 'Nama Lengkap', required: true, enabled: true },
  { key: 'birthPlace', label: 'Tempat Lahir', required: true, enabled: true },
  { key: 'birthDate', label: 'Tanggal Lahir', required: true, enabled: true },
  { key: 'gender', label: 'Jenis Kelamin', required: true, enabled: true },
  { key: 'maritalStatus', label: 'Status Perkawinan', required: false, enabled: true },
  { key: 'address', label: 'Alamat', required: true, enabled: true },
  { key: 'kampung', label: 'Kampung', required: false, enabled: false },
  { key: 'desa', label: 'Desa', required: false, enabled: false },
  { key: 'kecamatan', label: 'Kecamatan', required: true, enabled: true },
  { key: 'kabupaten', label: 'Kabupaten', required: true, enabled: true },
  { key: 'provinsi', label: 'Provinsi', required: true, enabled: true },
  { key: 'lastEducation', label: 'Pendidikan Terakhir', required: true, enabled: true },
  { key: 'graduationYear', label: 'Tahun Lulus', required: false, enabled: false },
  { key: 'height', label: 'Tinggi Badan', required: false, enabled: false },
  { key: 'weight', label: 'Berat Badan', required: false, enabled: false },
  { key: 'bloodType', label: 'Golongan Darah', required: false, enabled: false },
  { key: 'clothingSize', label: 'Ukuran Baju', required: false, enabled: false },
  { key: 'phone', label: 'No. WA', required: true, enabled: true },
  { key: 'guardianName', label: 'Nama Wali', required: false, enabled: false },
  { key: 'guardianPhone', label: 'No. WA Wali', required: false, enabled: false },
  { key: 'fatherOccupation', label: 'Pekerjaan Ayah', required: false, enabled: false },
  { key: 'motherOccupation', label: 'Pekerjaan Ibu', required: false, enabled: false },
  { key: 'childOrder', label: 'Anak Ke-', required: false, enabled: false },
  { key: 'totalSiblings', label: 'Jumlah Saudara', required: false, enabled: false },
]

const DEFAULT_AFFILIATE_FIELDS: Field[] = [
  { key: 'fullName', label: 'Nama Lengkap', required: true, enabled: true },
  { key: 'nik', label: 'NIK', required: true, enabled: true },
  { key: 'phone', label: 'No. WA', required: true, enabled: true },
  { key: 'email', label: 'Email', required: true, enabled: true },
  { key: 'address', label: 'Alamat', required: true, enabled: true },
  { key: 'bankName', label: 'Nama Bank', required: true, enabled: true },
  { key: 'bankAccount', label: 'No. Rekening', required: true, enabled: true },
  { key: 'bankAccountName', label: 'Nama Pemilik Rekening', required: true, enabled: true },
  { key: 'instagram', label: 'Instagram', required: false, enabled: true },
  { key: 'tiktok', label: 'TikTok', required: false, enabled: true },
  { key: 'facebook', label: 'Facebook', required: false, enabled: true },
  { key: 'youtube', label: 'YouTube', required: false, enabled: true },
]

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

export default function FormSettings({ onBack }: { onBack?: () => void }) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [formType, setFormType] = useState<'REGISTER' | 'AFFILIATE'>('REGISTER')
  const [title, setTitle] = useState('')
  const [programIds, setProgramIds] = useState<string[]>([])
  const [template, setTemplate] = useState('default')
  const [fields, setFields] = useState<Field[]>(DEFAULT_REGISTER_FIELDS)

  const { data: settingsList } = useQuery({
    queryKey: ['form-settings'],
    queryFn: async () => {
      const { data } = await api.get('/checkout')
      return data.data || []
    },
  })

  const { data: programsData } = useQuery({
    queryKey: ['programs-all'],
    queryFn: async () => {
      const { data } = await api.get('/programs?limit=200')
      return data.data || []
    },
  })

  const filteredSettings = useMemo(() => {
    if (!settingsList) return []
    let filtered = [...settingsList]
    if (searchQuery) {
      filtered = filtered.filter((s: any) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return filtered
  }, [settingsList, searchQuery])

  const saveMutation = useMutation({
    mutationFn: async (values: { id?: string; formType: string; title: string; programIds: string[]; template: string; fields: Field[] }) => {
      if (values.id) {
        const { data } = await api.put(`/checkout/${values.id}`, values)
        return data.data
      }
      const { data } = await api.post('/checkout', values)
      return data.data
    },
    onSuccess: (result) => {
      toast({ title: 'Pengaturan form berhasil disimpan' })
      queryClient.invalidateQueries({ queryKey: ['form-settings'] })
      setSavedSlug(result.slug)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menyimpan', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/checkout/${id}`)
    },
    onSuccess: () => {
      toast({ title: 'Pengaturan form berhasil dihapus' })
      queryClient.invalidateQueries({ queryKey: ['form-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menghapus', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setFormType('REGISTER')
    setTitle('')
    setProgramIds([])
    setTemplate('default')
    setFields(DEFAULT_REGISTER_FIELDS)
    setEditingId(null)
    setSavedSlug(null)
    setShowForm(false)
  }

  const startEdit = (setting: any) => {
    setFormType(setting.formType || 'REGISTER')
    setTitle(setting.title)
    setProgramIds(setting.programIds || [])
    setTemplate(setting.template || 'default')
    setFields(setting.fields || (setting.formType === 'AFFILIATE' ? DEFAULT_AFFILIATE_FIELDS : DEFAULT_REGISTER_FIELDS))
    setEditingId(setting.id)
    setSavedSlug(setting.slug)
    setShowForm(true)
  }

  const toggleProgram = (id: string) => {
    setProgramIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const toggleFieldEnabled = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f))
  }

  const toggleFieldRequired = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, required: !f.required } : f))
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: 'Judul harus diisi', variant: 'destructive' })
      return
    }
    if (formType === 'REGISTER' && programIds.length === 0) {
      toast({ title: 'Pilih minimal satu program', variant: 'destructive' })
      return
    }
    saveMutation.mutate({ id: editingId || undefined, formType, title, programIds, template, fields })
  }

  const copyLink = (slug: string) => {
    const url = `${BASE_URL}/checkout/${slug}`
    navigator.clipboard.writeText(url)
    toast({ title: 'Link berhasil disalin!' })
  }

  const enabledCount = fields.filter(f => f.enabled).length
  const requiredCount = fields.filter(f => f.enabled && f.required).length

  return (
    <div className="space-y-6">
      {!showForm ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {onBack && (
                  <button onClick={onBack} className="text-[#009ce1] hover:text-[#0077b3] transition-colors p-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                <div>
                  <h1 className="text-lg font-bold">Pengaturan Form</h1>
                  <p className="text-xs text-muted-foreground">Kelola form pendaftaran</p>
                </div>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Form Baru
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari form..."
              className="pl-9 h-9 text-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Settings List */}
          {!settingsList || settingsList.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">Belum ada pengaturan form</p>
                <p className="text-xs text-slate-400 mt-1">Klik "Tambah Form Baru" untuk membuat form pertama</p>
              </CardContent>
            </Card>
          ) : filteredSettings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-sm font-medium text-slate-600">Tidak ada form yang sesuai</p>
                <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredSettings.map((setting: any) => (
                <Card key={setting.id} className="hover:shadow-md transition-shadow border-slate-200/80">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-slate-800">{setting.title}</h3>
                          <Badge variant={setting.isActive ? 'success' : 'secondary'} className="text-[10px]">
                            {setting.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            setting.formType === 'AFFILIATE'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {setting.formType === 'AFFILIATE' ? <UserCheck className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                            {setting.formType === 'AFFILIATE' ? 'Affiliate' : 'Kandidat'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                          Template: {setting.template} | Field aktif: {(setting.fields || []).filter((f: Field) => f.enabled).length} | Wajib: {(setting.fields || []).filter((f: Field) => f.enabled && f.required).length}{setting.formType === 'REGISTER' ? ` | Program: ${(setting.programIds || []).length}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <code className="text-[10px] bg-slate-100 px-2 py-1 rounded font-mono text-slate-500 truncate max-w-[300px]">
                            {BASE_URL}/checkout/{setting.slug}
                          </code>
                          <button onClick={() => copyLink(setting.slug)} className="text-slate-400 hover:text-[#009ce1] transition-colors p-1" title="Salin link">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => window.open(`/checkout/${setting.slug}`, '_blank')} className="text-slate-400 hover:text-[#009ce1] transition-colors p-1" title="Buka form">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => startEdit(setting)}>
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="h-8" onClick={() => {
                          if (window.confirm('Hapus pengaturan form ini?')) deleteMutation.mutate(setting.id)
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Back */}
          <button
            onClick={resetForm}
            className="text-xs text-[#009ce1] hover:text-[#0077b3] font-medium inline-flex items-center gap-1 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Kembali
          </button>

          {/* Header */}
          <div>
            <h1 className="text-lg font-bold">{editingId ? 'Edit' : 'Buat'} Pengaturan Form</h1>
            <p className="text-xs text-muted-foreground">Konfigurasi form pendaftaran</p>
          </div>

          {/* Form Info */}
          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle className="text-sm">Informasi Form</CardTitle>
              <CardDescription className="text-xs">Judul dan template tampilan form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipe Form</Label>
                <Select
                  value={formType}
                  onChange={e => {
                    const newType = e.target.value as 'REGISTER' | 'AFFILIATE'
                    setFormType(newType)
                    setFields(newType === 'AFFILIATE' ? DEFAULT_AFFILIATE_FIELDS : DEFAULT_REGISTER_FIELDS)
                    if (newType === 'AFFILIATE') setProgramIds([])
                  }}
                  className="text-xs"
                >
                  <option value="REGISTER">Kandidat</option>
                  <option value="AFFILIATE">Affiliate</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Judul Form</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Pendaftaran Program XYZ" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Template Tampilan</Label>
                <Select value={template} onChange={e => setTemplate(e.target.value)} className="text-xs">
                  {TEMPLATES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Program Selection */}
          {formType === 'REGISTER' && (
            <Card className="border-slate-200/80">
              <CardHeader>
                <CardTitle className="text-sm">Program Tersedia</CardTitle>
                <CardDescription className="text-xs">Pilih program yang bisa dipilih kandidat</CardDescription>
              </CardHeader>
              <CardContent>
                {!programsData || programsData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada program tersedia</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {programsData.map((p: any) => (
                      <label key={p.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${programIds.includes(p.id) ? 'border-[#009ce1] bg-[#009ce1]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input
                          type="checkbox"
                          checked={programIds.includes(p.id)}
                          onChange={() => toggleProgram(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#009ce1] focus:ring-[#009ce1]/20"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.country || '-'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Field Configuration */}
          <Card className="border-slate-200/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Field Form</CardTitle>
                   <CardDescription className="text-xs">Atur field yang ditampilkan di form pendaftaran</CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-700">{enabledCount} aktif</span>
                  <span className="text-[10px] text-slate-400 block">{requiredCount} wajib</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2.5 pr-4 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">Field</th>
                      <th className="text-center py-2.5 px-4 font-semibold text-slate-400 text-[10px] uppercase tracking-wider min-w-[90px]">Aktif</th>
                      <th className="text-center py-2.5 px-4 font-semibold text-slate-400 text-[10px] uppercase tracking-wider min-w-[90px]">Wajib</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(field => (
                      <tr key={field.key} className={`border-b border-slate-100 transition-colors ${!field.enabled ? 'opacity-40' : 'hover:bg-slate-50/50'}`}>
                        <td className="py-2.5 pr-4">
                          <span className="text-sm font-medium text-slate-800">{field.label}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => toggleFieldEnabled(field.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              field.enabled
                                ? 'bg-[#009ce1]/10 text-[#009ce1] hover:bg-[#009ce1]/15'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${field.enabled ? 'bg-[#009ce1]' : 'bg-slate-300'}`} />
                            {field.enabled ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => toggleFieldRequired(field.key)}
                            disabled={!field.enabled}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              !field.enabled
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : field.required
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${field.required && field.enabled ? 'bg-rose-500' : 'bg-slate-300'}`} />
                            {field.required && field.enabled ? 'Wajib' : 'Opsional'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? 'Perbarui' : 'Simpan'} Pengaturan
            </Button>
          </div>

          {/* Success Card */}
          {savedSlug && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">Form berhasil dibuat!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Link form pendaftaran:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-[10px] bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate flex-1 font-mono text-emerald-700">
                        {BASE_URL}/checkout/{savedSlug}
                      </code>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => copyLink(savedSlug)}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Salin
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.open(`/checkout/${savedSlug}`, '_blank')}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Buka
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
