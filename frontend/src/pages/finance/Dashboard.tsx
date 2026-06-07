import { useQuery } from '@tanstack/react-query'
import { CreditCard, CheckCircle, XCircle, Award } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

function KPI({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white border border-[#009ce1]/20 rounded-sm p-5 hover:shadow-md hover:border-[#009ce1]/30 transition-all">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-sm flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function FinanceDashboardPage() {
  const { data } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: async () => { const { data } = await api.get('/dashboard/finance'); return data.data },
  })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-sm font-bold">Dashboard Finance</h1>
        <p className="text-xs text-muted-foreground">Ringkasan pembayaran & komisi</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Menunggu Verifikasi" value={data?.paymentSummary?.pending || 0} icon={CreditCard} color="bg-orange-500" />
        <KPI label="Pembayaran Valid" value={data?.paymentSummary?.validated || 0} icon={CheckCircle} color="bg-green-600" />
        <KPI label="Pembayaran Ditolak" value={data?.paymentSummary?.rejected || 0} icon={XCircle} color="bg-red-500" />
        <KPI label="Komisi Pending" value={data?.commissionPending || 0} icon={Award} color="bg-purple-600" />
      </div>
      <div className="bg-white border border-[#009ce1]/20 rounded-sm p-5 hover:shadow-md hover:border-[#009ce1]/30 transition-all">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendapatan Bulan Ini</p>
        <p className="text-sm font-bold text-fb-blue mt-1">{formatCurrency(data?.monthlyRevenue || 0)}</p>
      </div>
    </div>
  )
}
