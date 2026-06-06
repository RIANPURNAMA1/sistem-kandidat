import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Card, CardContent, CardHeader, CardTitle, Select } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

const schema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit'),
  fullName: z.string().min(3),
  birthPlace: z.string().min(2),
  birthDate: z.string(),
  gender: z.enum(['LAKI_LAKI', 'PEREMPUAN']),
  maritalStatus: z.enum(['BELUM_MENIKAH', 'MENIKAH', 'CERAI']),
  address: z.string().min(10),
  kampung: z.string().optional(),
  desa: z.string().optional(),
  kecamatan: z.string().min(2),
  kabupaten: z.string().min(2),
  provinsi: z.string().min(2),
  lastEducation: z.string().min(2),
  graduationYear: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  weight: z.coerce.number().optional(),
  bloodType: z.enum(['A','B','AB','O']).optional(),
  clothingSize: z.string().optional(),
  phone: z.string().min(10),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  childOrder: z.coerce.number().optional(),
  totalSiblings: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export default function CandidateProfile() {
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => { const { data } = await api.get('/candidates/profile'); return data.data },
  })
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: profile ? { ...profile, birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '' } : undefined,
  })
  const mutation = useMutation({
    mutationFn: async (data: FormData) => profile ? api.put('/candidates/profile', data) : api.post('/candidates/profile', data),
    onSuccess: () => { toast({ title: 'Profil berhasil disimpan!' }); qc.invalidateQueries({ queryKey: ['my-profile'] }) },
    onError: (err: any) => toast({ title: 'Gagal menyimpan', description: err?.response?.data?.message, variant: 'destructive' }),
  })
  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_,i) => <Card key={i} className="h-48 animate-pulse" />)}</div>
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Profil Kandidat</h1>
        <p className="text-sm text-muted-foreground">Lengkapi data diri untuk mendaftar program</p>
      </div>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Data Identitas</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="NIK *" error={errors.nik?.message}><Input {...register('nik')} placeholder="16 digit" maxLength={16} /></F>
              <F label="Nama Lengkap *" error={errors.fullName?.message}><Input {...register('fullName')} placeholder="Sesuai KTP" /></F>
              <F label="Tempat Lahir *" error={errors.birthPlace?.message}><Input {...register('birthPlace')} /></F>
              <F label="Tanggal Lahir *"><Input type="date" {...register('birthDate')} /></F>
              <F label="Jenis Kelamin *">
                <Select {...register('gender')}><option value="">Pilih...</option><option value="LAKI_LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></Select>
              </F>
              <F label="Status Pernikahan *">
                <Select {...register('maritalStatus')}><option value="">Pilih...</option><option value="BELUM_MENIKAH">Belum Menikah</option><option value="MENIKAH">Menikah</option><option value="CERAI">Cerai</option></Select>
              </F>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Alamat</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <F label="Alamat Lengkap *" error={errors.address?.message}>
                  <textarea className="flex min-h-[72px] w-full rounded-md border border-fb-gray-light bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-blue" {...register('address')} />
                </F>
              </div>
              <F label="Kampung"><Input {...register('kampung')} /></F>
              <F label="Desa"><Input {...register('desa')} /></F>
              <F label="Kecamatan *" error={errors.kecamatan?.message}><Input {...register('kecamatan')} /></F>
              <F label="Kabupaten/Kota *" error={errors.kabupaten?.message}><Input {...register('kabupaten')} /></F>
              <F label="Provinsi *" error={errors.provinsi?.message}><Input {...register('provinsi')} /></F>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pendidikan & Fisik</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Pendidikan Terakhir *">
                <Select {...register('lastEducation')}><option value="">Pilih...</option>{['SD','SMP','SMA/SMK','D1','D2','D3','S1','S2','S3'].map(e => <option key={e} value={e}>{e}</option>)}</Select>
              </F>
              <F label="Tahun Lulus"><Input type="number" {...register('graduationYear')} placeholder="2020" /></F>
              <F label="Tinggi (cm)"><Input type="number" {...register('height')} /></F>
              <F label="Berat (kg)"><Input type="number" {...register('weight')} /></F>
              <F label="Gol. Darah">
                <Select {...register('bloodType')}><option value="">Pilih...</option>{['A','B','AB','O'].map(b => <option key={b} value={b}>{b}</option>)}</Select>
              </F>
              <F label="Ukuran Baju">
                <Select {...register('clothingSize')}><option value="">Pilih...</option>{['XS','S','M','L','XL','XXL','XXXL'].map(s => <option key={s} value={s}>{s}</option>)}</Select>
              </F>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Kontak & Keluarga</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Nomor HP *" error={errors.phone?.message}><Input {...register('phone')} placeholder="08xxxxxxxxxx" /></F>
              <F label="Nama Wali"><Input {...register('guardianName')} /></F>
              <F label="No. HP Wali"><Input {...register('guardianPhone')} /></F>
              <F label="Pekerjaan Ayah"><Input {...register('fatherOccupation')} /></F>
              <F label="Pekerjaan Ibu"><Input {...register('motherOccupation')} /></F>
              <F label="Anak ke-"><Input type="number" {...register('childOrder')} /></F>
              <F label="Jumlah Saudara"><Input type="number" {...register('totalSiblings')} /></F>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} size="lg">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</> : <><Save className="h-4 w-4 mr-2" />Simpan Profil</>}
          </Button>
        </div>
      </form>
    </div>
  )
}
