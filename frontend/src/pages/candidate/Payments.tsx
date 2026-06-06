import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, CreditCard, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils'
import api from '@/services/api'

export default function CandidatePayments() {
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => { const { data } = await api.get('/payments/my'); return data.data },
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ paymentId, file }: { paymentId: string; file: File }) => {
      const fd = new FormData(); fd.append('proof', file)
      return api.post(`/payments/${paymentId}/upload-proof`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: (res) => {
      const ocr = res.data.data.ocr
      toast({ title: 'Bukti transfer diupload!', description: `AI OCR: ${ocr?.confidence?.toFixed(0)}% confidence` })
      qc.invalidateQueries({ queryKey: ['my-payments'] })
      setUploadingId(null)
    },
    onError: (err: any) => toast({ title: 'Upload gagal', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const handleFileSelect = (paymentId: string, file: File) => {
    uploadMutation.mutate({ paymentId, file })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Pembayaran</h1>
        <p className="text-sm text-muted-foreground">Upload dan pantau status pembayaran program</p>
      </div>

      {/* Bank info */}
      <Card className="bg-fb-blue-light border-fb-blue/20">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-fb-blue mb-2">Informasi Rekening Pembayaran</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-fb-blue">
            <div><span className="text-blue-500">Bank</span><p className="font-bold">BCA</p></div>
            <div><span className="text-blue-500">No. Rekening</span><p className="font-bold font-mono">1234 5678 90</p></div>
            <div><span className="text-blue-500">Atas Nama</span><p className="font-bold">PT Mendunia Indonesia</p></div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">{[...Array(2)].map((_,i) => <Card key={i} className="h-32 animate-pulse" />)}</div>
      ) : payments?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada pembayaran</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments?.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-semibold">{p.application?.program?.name}</p>
                    <p className="text-2xl font-bold text-fb-blue mt-1">{formatCurrency(p.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link to={`/candidate/payments/${p.id}/invoice`}>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold border-slate-200">
                        <FileText className="h-3 w-3 mr-1" />
                        Invoice
                      </Button>
                    </Link>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </div>
                </div>

                {p.status === 'MENUNGGU_UPLOAD' && (
                  <div className="border-2 border-dashed border-fb-gray-light rounded-lg p-4 text-center">
                    <AlertCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">Segera upload bukti transfer</p>
                    <p className="text-xs text-muted-foreground mb-3">Transfer ke BCA 1234567890 a.n. PT Mendunia</p>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                      onChange={e => { if (e.target.files?.[0] && uploadingId) handleFileSelect(uploadingId, e.target.files[0]) }} />
                    <Button onClick={() => { setUploadingId(p.id); setTimeout(() => fileRef.current?.click(), 50) }} disabled={uploadMutation.isPending}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadMutation.isPending && uploadingId === p.id ? 'Mengupload + OCR...' : 'Upload Bukti Transfer'}
                    </Button>
                  </div>
                )}

                {p.status !== 'MENUNGGU_UPLOAD' && (
                  <div className="space-y-2 text-xs">
                    {p.proofUrl && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        <span>Bukti transfer terupload</span>
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-fb-blue underline">Lihat</a>
                      </div>
                    )}
                    {p.senderName && <p className="text-muted-foreground">Nama pengirim: <span className="font-medium text-foreground">{p.senderName}</span></p>}
                    {p.uploadedAt && <p className="text-muted-foreground">Diupload: {formatDateTime(p.uploadedAt)}</p>}
                    {p.verifiedAt && <p className="text-muted-foreground">Diverifikasi: {formatDateTime(p.verifiedAt)}</p>}
                    {p.rejectedReason && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">Alasan penolakan: {p.rejectedReason}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
