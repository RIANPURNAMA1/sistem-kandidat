import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/index'
import { Loader2, Plus, Copy, CheckCircle, Trash2, ExternalLink } from 'lucide-react'
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

const DEFAULT_FIELDS: Field[] = [
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
  { key: 'phone', label: 'No. Telepon', required: true, enabled: true },
  { key: 'guardianName', label: 'Nama Wali', required: false, enabled: false },
  { key: 'guardianPhone', label: 'No. Telepon Wali', required: false, enabled: false },
  { key: 'fatherOccupation', label: 'Pekerjaan Ayah', required: false, enabled: false },
  { key: 'motherOccupation', label: 'Pekerjaan Ibu', required: false, enabled: false },
  { key: 'childOrder', label: 'Anak Ke-', required: false, enabled: false },
  { key: 'totalSiblings', label: 'Jumlah Saudara', required: false, enabled: false },
]

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

export default function CheckoutSettingsForm() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [programIds, setProgramIds] = useState<string[]>([])
  const [template, setTemplate] = useState('default')
  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS)

  const { data: settingsList } = useQuery({
    queryKey: ['checkout-settings'],
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

  const saveMutation = useMutation({
    mutationFn: async (values: { id?: string; title: string; programIds: string[]; template: string; fields: Field[] }) => {
      if (values.id) {
        const { data } = await api.put(`/checkout/${values.id}`, values)
        return data.data
      }
      const { data } = await api.post('/checkout', values)
      return data.data
    },
    onSuccess: (result) => {
      toast({ title: 'Pengaturan checkout berhasil disimpan' })
      queryClient.invalidateQueries({ queryKey: ['checkout-settings'] })
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
      toast({ title: 'Pengaturan checkout berhasil dihapus' })
      queryClient.invalidateQueries({ queryKey: ['checkout-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menghapus', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  const resetForm = () => {
    setTitle('')
    setProgramIds([])
    setTemplate('default')
    setFields(DEFAULT_FIELDS)
    setEditingId(null)
    setSavedSlug(null)
    setShowForm(false)
  }

  const startEdit = (setting: any) => {
    setTitle(setting.title)
    setProgramIds(setting.programIds || [])
    setTemplate(setting.template || 'default')
    setFields(setting.fields || DEFAULT_FIELDS)
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
    if (programIds.length === 0) {
      toast({ title: 'Pilih minimal satu program', variant: 'destructive' })
      return
    }
    saveMutation.mutate({ id: editingId || undefined, title, programIds, template, fields })
  }

  const copyLink = (slug: string) => {
    const url = `${BASE_URL}/checkout/${slug}`
    navigator.clipboard.writeText(url)
    toast({ title: 'Link berhasil disalin!' })
  }

  return (
    <div className="space-y-6">
      {!showForm ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Pengaturan Checkout</h1>
              <p className="text-xs text-muted-foreground">Kelola form pendaftaran/checkout untuk kandidat</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Baru
            </Button>
          </div>

          {!settingsList || settingsList.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Belum ada pengaturan checkout</p>
                <p className="text-xs text-muted-foreground mt-1">Klik "Tambah Baru" untuk membuat form checkout</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {settingsList.map((setting: any) => (
                <Card key={setting.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{setting.title}</h3>
                          <Badge variant={setting.isActive ? 'success' : 'secondary'}>
                            {setting.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Template: {setting.template} | Program: {(setting.programIds || []).length} | Field: {(setting.fields || []).filter((f: Field) => f.enabled).length}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{BASE_URL}/checkout/{setting.slug}</code>
                          <button onClick={() => copyLink(setting.slug)} className="text-muted-foreground hover:text-foreground">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => startEdit(setting)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => {
                          if (window.confirm('Hapus pengaturan ini?')) deleteMutation.mutate(setting.id)
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
          <button
            onClick={resetForm}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Kembali
          </button>

          <div>
            <h1 className="text-lg font-bold">{editingId ? 'Edit' : 'Buat'} Pengaturan Checkout</h1>
            <p className="text-xs text-muted-foreground">Konfigurasi form pendaftaran untuk kandidat</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informasi Form</CardTitle>
              <CardDescription className="text-xs">Judul dan template form checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Judul Form</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Pendaftaran Program XYZ" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Template Tampilan</Label>
                <Select value={template} onChange={e => setTemplate(e.target.value)}>
                  {TEMPLATES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
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
                    <label key={p.id} className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${programIds.includes(p.id) ? 'border-indigo-400 bg-indigo-50' : 'border-border/60 hover:border-indigo-200'}`}>
                      <input
                        type="checkbox"
                        checked={programIds.includes(p.id)}
                        onChange={() => toggleProgram(p.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.country || '-'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Field Form</CardTitle>
              <CardDescription className="text-xs">Atur field yang ditampilkan di form checkout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Field</th>
                      <th className="text-center py-2 px-4 font-semibold text-muted-foreground min-w-[80px]">Aktif</th>
                      <th className="text-center py-2 px-4 font-semibold text-muted-foreground min-w-[90px]">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(field => (
                      <tr key={field.key} className={`border-b border-border/20 ${!field.enabled ? 'opacity-40' : ''}`}>
                        <td className="py-2.5 pr-4">
                          <span className="text-sm font-medium text-foreground">{field.label}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => toggleFieldEnabled(field.key)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                              field.enabled
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${field.enabled ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                            {field.enabled ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => toggleFieldRequired(field.key)}
                            disabled={!field.enabled}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                              !field.enabled
                                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                : field.required
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${field.required && field.enabled ? 'bg-rose-500' : 'bg-slate-300'}`} />
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

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? 'Perbarui' : 'Simpan'} Pengaturan
            </Button>
          </div>

          {savedSlug && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">Form berhasil dibuat!</p>
                    <p className="text-xs text-emerald-600 mt-1">Link form checkout:</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <code className="text-xs bg-white px-2 py-1 rounded border border-emerald-200 truncate flex-1">
                        {BASE_URL}/checkout/{savedSlug}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => copyLink(savedSlug)} className="shrink-0">
                        <Copy className="h-3.5 w-3.5 mr-1" /> Salin
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(`/checkout/${savedSlug}`, '_blank')} className="shrink-0">
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
