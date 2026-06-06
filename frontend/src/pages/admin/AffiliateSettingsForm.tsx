import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

export default function AffiliateSettingsForm() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    affiliate_min_withdrawal: '',
    affiliate_default_commission: '',
  })

  const { data } = useQuery({
    queryKey: ['affiliate-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/affiliate')
      return data.data || {}
    },
  })

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        affiliate_min_withdrawal: data.affiliate_min_withdrawal || prev.affiliate_min_withdrawal,
        affiliate_default_commission: data.affiliate_default_commission || prev.affiliate_default_commission,
      }))
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data } = await api.put('/settings/affiliate', values)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Pengaturan afiliasi berhasil disimpan' })
      queryClient.invalidateQueries({ queryKey: ['affiliate-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menyimpan pengaturan', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Minimum Pencairan</CardTitle>
          <CardDescription className="text-xs">Jumlah minimal komisi yang harus terkumpul sebelum affiliate dapat melakukan pencairan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Minimum Penarikan (Rp)</Label>
            <Input
              value={form.affiliate_min_withdrawal}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                setForm(f => ({ ...f, affiliate_min_withdrawal: v }))
              }}
              placeholder="500000"
            />
            <p className="text-xs text-muted-foreground">
              {form.affiliate_min_withdrawal
                ? `Rp ${Number(form.affiliate_min_withdrawal).toLocaleString('id-ID')}`
                : 'Masukkan nominal dalam Rupiah'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Komisi Default</CardTitle>
          <CardDescription className="text-xs">Komisi default per referral jika program tidak menentukan komisi khusus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Komisi Default (Rp)</Label>
            <Input
              value={form.affiliate_default_commission}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                setForm(f => ({ ...f, affiliate_default_commission: v }))
              }}
              placeholder="100000"
            />
            <p className="text-xs text-muted-foreground">
              {form.affiliate_default_commission
                ? `Rp ${Number(form.affiliate_default_commission).toLocaleString('id-ID')}`
                : 'Masukkan nominal dalam Rupiah'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  )
}
