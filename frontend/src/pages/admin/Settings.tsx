import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Settings, Mail, MessageSquare, CreditCard, Globe, ScanLine, Loader2, Eye, EyeOff, Phone, PhoneOff, Play, Square } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

const sections = [
  { icon: Globe, label: 'Pengaturan Website', desc: 'Nama situs, tagline, alamat, kontak' },
  { icon: ScanLine, label: 'Pengaturan OCR', desc: 'Threshold confidence, auto-verifikasi' },
  { icon: MessageSquare, label: 'Pengaturan WhatsApp', desc: 'API gateway, template pesan' },
  { icon: Mail, label: 'Pengaturan Email', desc: 'SMTP, template email notifikasi' },
  { icon: CreditCard, label: 'Pengaturan Rekening', desc: 'Rekening tujuan pembayaran' },
  { icon: Settings, label: 'Pengaturan Affiliate', desc: 'Minimum pencairan, komisi default' },
]

function WhatsAppSettingsForm() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    wa_api_url: '',
    wa_api_key: '',
    wa_sender_number: '',
  })
  const [testNumber, setTestNumber] = useState('')
  const [showKey, setShowKey] = useState(false)

  const { data } = useQuery({
    queryKey: ['whatsapp-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/whatsapp')
      return data.data || {}
    },
  })

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data } = await api.get('/settings/whatsapp/status')
      return data.data
    },
    refetchInterval: 10000,
  })

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        wa_api_url: data.wa_api_url || prev.wa_api_url,
        wa_api_key: data.wa_api_key || prev.wa_api_key,
        wa_sender_number: data.wa_sender_number || prev.wa_sender_number,
      }))
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data } = await api.put('/settings/whatsapp', values)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Pengaturan WhatsApp berhasil disimpan' })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menyimpan pengaturan', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/settings/whatsapp/start')
      return data
    },
    onSuccess: () => {
      toast({ title: 'WhatsApp sender berhasil dijalankan' })
      refetchStatus()
    },
    onError: (err: any) => toast({ title: 'Gagal menjalankan sender', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/settings/whatsapp/stop')
      return data
    },
    onSuccess: () => {
      toast({ title: 'WhatsApp sender berhasil dihentikan' })
      refetchStatus()
    },
    onError: (err: any) => toast({ title: 'Gagal menghentikan sender', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const testMutation = useMutation({
    mutationFn: async (to: string) => {
      const { data } = await api.post('/settings/whatsapp/test', { to })
      return data
    },
    onSuccess: () => toast({ title: 'Pesan test berhasil dikirim! Periksa nomor tujuan.' }),
    onError: (err: any) => toast({ title: 'Gagal mengirim pesan test', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const connected = statusData?.connected
  const senderNumber = statusData?.number

  return (
    <div className="space-y-6">
      {/* Status Sender */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Sender</CardTitle>
          <CardDescription>Status koneksi WhatsApp sender saat ini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${connected ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {connected ? <Phone className="h-5 w-5 text-emerald-600" /> : <PhoneOff className="h-5 w-5 text-red-500" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{connected ? 'Tersambung' : 'Tidak Tersambung'}</p>
                <p className="text-xs text-muted-foreground">{senderNumber ? `Nomor: ${senderNumber}` : 'Belum ada nomor'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!connected ? (
                <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="gap-1.5">
                  {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Start Sender
                </Button>
              ) : (
                <Button onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending} variant="destructive" className="gap-1.5">
                  {stopMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                  Stop Sender
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Konfigurasi API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konfigurasi API Gateway</CardTitle>
          <CardDescription>Pengaturan koneksi ke gateway WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>API URL</Label>
            <Input
              value={form.wa_api_url}
              onChange={e => setForm(f => ({ ...f, wa_api_url: e.target.value }))}
              placeholder="https://api.whatsapp-gateway.com"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={form.wa_api_key}
                  onChange={e => setForm(f => ({ ...f, wa_api_key: e.target.value }))}
                  placeholder="your-api-key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Pengirim (opsional)</Label>
              <Input
                value={form.wa_sender_number}
                onChange={e => setForm(f => ({ ...f, wa_sender_number: e.target.value }))}
                placeholder="6281234567890"
              />
            </div>
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

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Pesan</CardTitle>
          <CardDescription>Kirim pesan percobaan untuk memastikan konfigurasi berfungsi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={testNumber}
              onChange={e => setTestNumber(e.target.value)}
              placeholder="6281234567890"
              className="w-52"
            />
            <Button
              variant="outline"
              onClick={() => testNumber && testMutation.mutate(testNumber)}
              disabled={!testNumber || testMutation.isPending}
            >
              {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Kirim Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmailSettingsForm() {
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
          <CardTitle className="text-base">Konfigurasi SMTP</CardTitle>
          <CardDescription>Pengaturan server email untuk mengirim notifikasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>SMTP Host</Label>
              <Input
                value={form.smtp_host}
                onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Port</Label>
              <Input
                value={form.smtp_port}
                onChange={e => setForm(f => ({ ...f, smtp_port: e.target.value }))}
                placeholder="587"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP User</Label>
              <Input
                value={form.smtp_user}
                onChange={e => setForm(f => ({ ...f, smtp_user: e.target.value }))}
                placeholder="email@gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Password</Label>
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
              <Label>SMTP Secure (SSL/TLS)</Label>
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
              <Label>From Address</Label>
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
          <CardTitle className="text-base">Notifikasi Email</CardTitle>
          <CardDescription>Atur notifikasi mana yang akan dikirim via email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notifToggles.map(n => (
            <div key={n.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
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

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  if (activeSection === 'Pengaturan Email') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection(null)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Kembali
          </button>
          <div>
            <h1 className="text-xl font-bold">Pengaturan Email</h1>
            <p className="text-sm text-muted-foreground">SMTP, template email notifikasi</p>
          </div>
        </div>
        <EmailSettingsForm />
      </div>
    )
  }

  if (activeSection === 'Pengaturan WhatsApp') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection(null)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Kembali
          </button>
          <div>
            <h1 className="text-xl font-bold">Pengaturan WhatsApp</h1>
            <p className="text-sm text-muted-foreground">API gateway, start/stop sender, template pesan</p>
          </div>
        </div>
        <WhatsAppSettingsForm />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Pengaturan Sistem</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi semua modul sistem</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(s => (
          <Card
            key={s.label}
            className={`hover:shadow-md transition-shadow cursor-pointer group ${s.label === 'Pengaturan Email' ? 'ring-2 ring-indigo-200' : ''}`}
            onClick={() => setActiveSection(s.label)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-fb-blue-light rounded-lg flex items-center justify-center group-hover:bg-fb-blue/20 transition-colors">
                  <s.icon className="h-5 w-5 text-fb-blue" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
