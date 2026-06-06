import { Card, CardContent } from '@/components/ui/index'

export default function FinanceCommissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Manajemen Komisi</h1>
        <p className="text-sm text-muted-foreground">Approval komisi affiliate</p>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Data komisi terintegrasi dengan halaman pembayaran
        </CardContent>
      </Card>
    </div>
  )
}
