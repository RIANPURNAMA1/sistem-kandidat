import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

export default function RekeningSettingsForm() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    bank_name: '',
    bank_account: '',
    bank_holder: '',
  })

  const { data } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/payment')
      return data.data || {}
    },
  })

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        bank_name: data.bank_name || prev.bank_name,
        bank_account: data.bank_account || prev.bank_account,
        bank_holder: data.bank_holder || prev.bank_holder,
      }))
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data } = await api.put('/settings/payment', values)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Pengaturan rekening berhasil disimpan' })
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menyimpan pengaturan', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Rekening Tujuan Pembayaran</CardTitle>
        <CardDescription className="text-xs">Rekening yang akan ditampilkan kepada kandidat untuk pembayaran pendaftaran</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nama Bank</Label>
          <Input
            value={form.bank_name}
            onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
            placeholder="BCA"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">No. Rekening</Label>
          <Input
            value={form.bank_account}
            onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
            placeholder="1234567890"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Atas Nama</Label>
          <Input
            value={form.bank_holder}
            onChange={e => setForm(f => ({ ...f, bank_holder: e.target.value }))}
            placeholder="PT KerjaNusantara Indonesia"
          />
        </div>
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Simpan Pengaturan
        </Button>
      </CardContent>
    </Card>
  )
}
