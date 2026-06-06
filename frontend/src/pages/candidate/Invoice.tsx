import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import api from '@/services/api'

export default function CandidateInvoicePage() {
  const { paymentId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['invoice', paymentId],
    queryFn: async () => {
      const { data } = await api.get(`/payments/${paymentId}/invoice`)
      return data.data
    },
  })

  if (isLoading) return (
    <div className="p-6 space-y-5 print:hidden">
      <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
      <div className="max-w-3xl mx-auto h-[600px] bg-slate-50 rounded-xl border border-slate-200 animate-pulse" />
    </div>
  )

  if (!data) return (
    <div className="p-6 text-center py-20 print:hidden">
      <p className="text-slate-500 font-medium">Invoice tidak ditemukan</p>
    </div>
  )

  const { invoiceNumber, invoiceDate, payment, candidate, program } = data

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white" id="invoice-root">
      <div className="p-6 space-y-5 max-w-3xl mx-auto print:p-0 print:space-y-0">
        {/* Toolbar - hidden when printing */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-slate-300 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-all"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak / PDF
          </button>
        </div>

        {/* Invoice */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border print:rounded-none">
          {/* Header */}
          <div className="px-10 py-8 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <img src="/logo3.png" alt="mendunia.id" className="h-8 w-auto mb-3" />
                <h1 className="text-lg font-bold text-slate-900">mendunia.id</h1>
                <p className="text-xs text-slate-500 mt-0.5">PT Mendunia Indonesia</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">INVOICE</h2>
                <p className="text-xs text-slate-500 mt-1 font-mono">{invoiceNumber}</p>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="px-10 py-6 border-b border-slate-100">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ditagih Kepada</p>
                <p className="text-sm font-bold text-slate-900">{candidate.fullName}</p>
                <p className="text-xs text-slate-500">{candidate.nik}</p>
                <p className="text-xs text-slate-500">{candidate.phone}</p>
                <p className="text-xs text-slate-500">{candidate.user?.email}</p>
                {candidate.address && (
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">{candidate.address}, {candidate.kecamatan}, {candidate.kabupaten}, {candidate.provinsi}</p>
                )}
              </div>
              <div className="text-right">
                <div className="space-y-1.5">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal Invoice</p>
                    <p className="text-xs font-semibold text-slate-900">{formatDate(invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
                      payment.status === 'VALID' ? 'bg-emerald-50 text-emerald-700' :
                      payment.status === 'DITOLAK' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    )}>
                      {payment.status === 'VALID' ? 'LUNAS' :
                       payment.status === 'DITOLAK' ? 'DITOLAK' :
                       'BELUM LUNAS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-10 py-6 border-b border-slate-100">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left border border-slate-200">Deskripsi</th>
                  <th className="px-4 py-3 text-center border border-slate-200">Jumlah</th>
                  <th className="px-4 py-3 text-right border border-slate-200">Harga</th>
                  <th className="px-4 py-3 text-right border border-slate-200">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-4 border border-slate-200">
                    <p className="font-semibold text-slate-900">{program?.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Biaya pendaftaran program</p>
                  </td>
                  <td className="px-4 py-4 text-center border border-slate-200 text-slate-900 font-semibold">1</td>
                  <td className="px-4 py-4 text-right border border-slate-200 text-slate-900 font-semibold">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-4 text-right border border-slate-200 text-slate-900 font-bold">{formatCurrency(payment.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="px-10 py-6 border-b border-slate-100">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Diskon</span>
                  <span className="font-semibold text-slate-900">Rp 0</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(payment.amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-6">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pembayaran</p>
                <p>Bank BCA</p>
                <p className="font-mono font-semibold text-slate-700">1234 5678 90</p>
                <p>PT Mendunia Indonesia</p>
                {payment.verifiedAt && (
                  <p className="mt-2 text-emerald-600 font-semibold">Lunas pada {formatDate(payment.verifiedAt)}</p>
                )}
              </div>
              <div className="text-center">
                <div className="bg-white rounded-lg border border-slate-100 p-2 inline-block">
                  <QRCodeSVG
                    value={invoiceNumber}
                    size={80}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#1e293b"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-mono tracking-wider">{invoiceNumber}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Penerbit</p>
                <p className="font-semibold text-slate-700">PT Mendunia Indonesia</p>
                <p>mendunia.id</p>
                <p className="text-[10px] mt-1">Invoice ini sah dan diterbitkan oleh sistem.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          html, body {
            margin: 0;
            padding: 0;
            min-height: auto !important;
            height: auto !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            margin: 0.3in;
            size: auto;
          }
          body * {
            visibility: hidden;
          }
          #invoice-root, #invoice-root * {
            visibility: visible;
          }
          #invoice-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
        }
      `}</style>
    </div>
  )
}
