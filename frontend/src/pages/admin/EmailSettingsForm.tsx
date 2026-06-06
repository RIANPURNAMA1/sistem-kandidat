import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

export default function EmailSettingsForm() {
  const queryClient = useQueryClient()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    email_payment_uploaded: 'true',
    email_payment_verified: 'true',
    email_payment_rejected: 'true',
  })
  const [testEmail, setTestEmail] = useState('')

  const { data } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/email')
      return data.data || {}
    },
  })

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        ...prev,
        smtp_host: data.smtp_host || prev.smtp_host,
        smtp_port: data.smtp_port || prev.smtp_port,
        smtp_secure: data.smtp_secure || prev.smtp_secure,
        smtp_user: data.smtp_user || prev.smtp_user,
        smtp_pass: data.smtp_pass || prev.smtp_pass,
        smtp_from: data.smtp_from || prev.smtp_from,
        email_payment_uploaded: data.email_payment_uploaded ?? prev.email_payment_uploaded,
        email_payment_verified: data.email_payment_verified ?? prev.email_payment_verified,
        email_payment_rejected: data.email_payment_rejected ?? prev.email_payment_rejected,
      }))
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data } = await api.put('/settings/email', values)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Pengaturan email berhasil disimpan' })
      queryClient.invalidateQueries({ queryKey: ['email-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menyimpan pengaturan', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  const testMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/settings/email/test', { email })
      return data
    },
    onSuccess: () => toast({ title: 'Email test berhasil dikirim! Periksa kotak masuk Anda.' }),
    onError: (err: any) => toast({ title: 'Gagal mengirim email test', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const notifToggles = [
    { key: 'email_payment_uploaded', label: 'Bukti pembayaran diupload', desc: 'Notifikasi ke admin saat kandidat upload bukti' },
    { key: 'email_payment_verified', label: 'Pembayaran diverifikasi', desc: 'Notifikasi ke kandidat saat pembayaran disetujui' },
    { key: 'email_payment_rejected', label: 'Pembayaran ditolak', desc: 'Notifikasi ke kandidat saat pembayaran ditolak' },
  ]

  return (
    <div className="space-y-6">
      {/* SMTP Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Konfigurasi SMTP</CardTitle>
          <CardDescription className="text-xs">Pengaturan server email untuk mengirim notifikasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Host</Label>
              <Input
                value={form.smtp_host}
                onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Port</Label>
              <Input
                value={form.smtp_port}
                onChange={e => setForm(f => ({ ...f, smtp_port: e.target.value }))}
                placeholder="587"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP User</Label>
              <Input
                value={form.smtp_user}
                onChange={e => setForm(f => ({ ...f, smtp_user: e.target.value }))}
                placeholder="email@gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.smtp_pass}
                  onChange={e => setForm(f => ({ ...f, smtp_pass: e.target.value }))}
                  placeholder="App password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Secure (SSL/TLS)</Label>
              <select
                value={form.smtp_secure}
                onChange={e => setForm(f => ({ ...f, smtp_secure: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-fb-gray-light bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fb-blue"
              >
                <option value="false">Tidak (Port 587)</option>
                <option value="true">Ya (Port 465)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From Address</Label>
              <Input
                value={form.smtp_from}
                onChange={e => setForm(f => ({ ...f, smtp_from: e.target.value }))}
                placeholder="noreply@kerjanusantara.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notifikasi Email</CardTitle>
          <CardDescription className="text-xs">Atur notifikasi mana yang akan dikirim via email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notifToggles.map(n => (
            <div key={n.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-xs font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[n.key as keyof typeof form] === 'true'}
                  onChange={e => setForm(f => ({ ...f, [n.key]: e.target.checked ? 'true' : 'false' }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Simpan Pengaturan
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Input
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="email@test.com"
            className="w-52"
          />
          <Button
            variant="outline"
            onClick={() => testEmail && testMutation.mutate(testEmail)}
            disabled={!testEmail || testMutation.isPending}
          >
            {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kirim Test Email
          </Button>
        </div>
      </div>
    </div>
  )
}
