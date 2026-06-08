import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Loader2, ScanLine, Play, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@/components/ui/toaster'

const SCHEDULE_OPTIONS = [
  { value: 'manual', label: 'Manual (hanya jika dijalankan manual)' },
  { value: '*/30 * * * *', label: 'Setiap 30 menit' },
  { value: '0 */1 * * *', label: 'Setiap 1 jam' },
  { value: '0 */6 * * *', label: 'Setiap 6 jam' },
  { value: '0 */12 * * *', label: 'Setiap 12 jam' },
  { value: '0 0 * * *', label: 'Setiap hari (00:00)' },
]

export default function OcrSettingsForm() {
  const queryClient = useQueryClient()
  const [analysisEnabled, setAnalysisEnabled] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState('70')
  const [schedule, setSchedule] = useState('manual')

  const { data, isLoading } = useQuery({
    queryKey: ['ocr-settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/ocr')
      return data.data || {}
    },
  })

  useEffect(() => {
    if (data) {
      setAnalysisEnabled(data.ocr_analysis_enabled !== 'false')
      setEnabled(data.ocr_auto_verify_enabled === 'true')
      setConfidenceThreshold(data.ocr_confidence_threshold || '70')
      setSchedule(data.ocr_auto_verify_schedule || 'manual')
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const { data } = await api.put('/settings/ocr', values)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Pengaturan OCR berhasil disimpan' })
      queryClient.invalidateQueries({ queryKey: ['ocr-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal menyimpan pengaturan', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  const autoVerifyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payments/auto-verify')
      return data.data
    },
    onSuccess: (result) => {
      const msg = `${result.verified} verified, ${result.skipped} skipped`
      toast({ title: 'Auto-verifikasi selesai', description: msg })
      queryClient.invalidateQueries({ queryKey: ['ocr-settings'] })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal auto-verifikasi', description: err?.response?.data?.message, variant: 'destructive' })
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      ocr_analysis_enabled: analysisEnabled ? 'true' : 'false',
      ocr_auto_verify_enabled: enabled ? 'true' : 'false',
      ocr_confidence_threshold: confidenceThreshold,
      ocr_auto_verify_schedule: schedule,
    })
  }

  const lastRun = data?.ocr_auto_verify_last_run
  const lastResult = data?.ocr_auto_verify_last_result
  let lastResultParsed: any = null
  if (lastResult) {
    try { lastResultParsed = JSON.parse(lastResult) } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Auto-Verifikasi</CardTitle>
          <CardDescription className="text-xs">Status fitur auto-verifikasi pembayaran berbasis OCR</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${enabled ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                <ScanLine className={`h-5 w-5 ${enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-xs font-semibold">{enabled ? 'Aktif' : 'Nonaktif'}</p>
                <p className="text-xs text-muted-foreground">
                  {schedule === 'manual'
                    ? 'Hanya berjalan saat dijalankan manual'
                    : `Menjadwalkan: ${SCHEDULE_OPTIONS.find(o => o.value === schedule)?.label || schedule}`
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => autoVerifyMutation.mutate()}
                disabled={autoVerifyMutation.isPending}
                variant="outline"
                className="gap-1.5"
              >
                {autoVerifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Jalankan Sekarang
              </Button>
            </div>
          </div>

          {/* Last Run Info */}
          {lastRun && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Terakhir dijalankan: {new Date(lastRun).toLocaleString('id-ID')}</span>
              </div>
              {lastResultParsed && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle className="h-3.5 w-3.5" /> {lastResultParsed.verified} verified
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" /> {lastResultParsed.skipped} skipped
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Konfigurasi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Konfigurasi Auto-Verifikasi</CardTitle>
          <CardDescription className="text-xs">Atur threshold confidence dan jadwal otomatisasi</CardDescription>
        </CardHeader>
          <CardContent className="space-y-4">
            {/* OCR Analysis Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
              <div>
                <Label className="text-xs font-semibold cursor-pointer" htmlFor="analysis-toggle">OCR Analysis pada Upload</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Scan bukti pembayaran dengan AI saat diupload oleh kandidat</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="analysis-toggle"
                  type="checkbox"
                  checked={analysisEnabled}
                  onChange={e => setAnalysisEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#009ce1]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#009ce1]" />
              </label>
            </div>

            {/* Toggle Auto-Verify */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
              <div>
                <Label className="text-xs font-semibold cursor-pointer" htmlFor="auto-verify-toggle">Aktifkan Auto-Verifikasi</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">Verifikasi pembayaran otomatis jika nominal OCR {'>='} harga program</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="auto-verify-toggle"
                  type="checkbox"
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#009ce1]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#009ce1]" />
              </label>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Confidence Threshold (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={confidenceThreshold}
                onChange={e => setConfidenceThreshold(e.target.value)}
                placeholder="70"
              />
              <p className="text-[10px] text-muted-foreground">Minimal confidence OCR untuk auto-verifikasi (0-100)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Jadwal Otomatis</Label>
              <Select value={schedule} onChange={e => setSchedule(e.target.value)} className="text-xs">
                {SCHEDULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <p className="text-[10px] text-muted-foreground">Pilih "Manual" jika hanya ingin dijalankan secara manual</p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informasi</CardTitle>
          <CardDescription className="text-xs">Bagaimana cara kerja auto-verifikasi?</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Sistem membaca nominal dari bukti transfer menggunakan OCR</li>
            <li>Jika nominal transfer <strong>lebih besar atau sama dengan</strong> harga program, pembayaran auto-verified</li>
            <li>Status pembayaran berubah menjadi <strong>VALID</strong> dan status aplikasi menjadi <strong>PAID</strong></li>
            <li>Komisi afiliasi otomatis dibuat jika kandidat direferensikan</li>
            <li>Notifikasi dikirim ke kandidat bahwa pembayaran telah terverifikasi</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
