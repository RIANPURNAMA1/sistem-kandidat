import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Loader2, Eye, EyeOff, Phone, PhoneOff, Play, Square, MessageSquare, Megaphone, Send } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

export default function WhatsAppSettingsForm() {
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
          <CardTitle className="text-sm">Status Sender</CardTitle>
          <CardDescription className="text-xs">Status koneksi WhatsApp sender saat ini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${connected ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {connected ? <Phone className="h-5 w-5 text-emerald-600" /> : <PhoneOff className="h-5 w-5 text-red-500" />}
              </div>
              <div>
                <p className="text-xs font-semibold">{connected ? 'Tersambung' : 'Tidak Tersambung'}</p>
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
          <CardTitle className="text-sm">Konfigurasi API Gateway</CardTitle>
          <CardDescription className="text-xs">Pengaturan koneksi ke gateway WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">API URL</Label>
            <Input
              value={form.wa_api_url}
              onChange={e => setForm(f => ({ ...f, wa_api_url: e.target.value }))}
              placeholder="https://api.whatsapp-gateway.com"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">API Key</Label>
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
              <Label className="text-xs">Nomor Pengirim (opsional)</Label>
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
          <CardTitle className="text-sm">Test Pesan</CardTitle>
          <CardDescription className="text-xs">Kirim pesan percobaan untuk memastikan konfigurasi berfungsi</CardDescription>
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

      {/* Follow-Up Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Follow-Up WhatsApp</CardTitle>
          <CardDescription className="text-xs">Atur pesan follow-up otomatis untuk kandidat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/admin/follow-up/categories" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
              <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Megaphone className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Kategori</p>
                <p className="text-[10px] text-slate-400">Atur kategori follow-up</p>
              </div>
            </Link>
            <Link to="/admin/follow-up/templates" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Template</p>
                <p className="text-[10px] text-slate-400">Buat template pesan</p>
              </div>
            </Link>
            <Link to="/admin/follow-up/send" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Send className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Kirim Pesan</p>
                <p className="text-[10px] text-slate-400">Kirim follow-up ke kandidat</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
