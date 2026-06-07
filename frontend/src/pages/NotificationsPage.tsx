import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import api from '@/services/api'

const notifIcons: Record<string, string> = {
  PAYMENT_UPLOADED: '📤',
  PAYMENT_VERIFIED: '✅',
  PAYMENT_REJECTED: '❌',
}

function getNotifRoute(n: any, role: string): string {
  const base = role === 'admin' ? '/admin' : role === 'finance' ? '/finance' : role === 'candidate' ? '/candidate' : '/affiliate'
  switch (n.type) {
    case 'PAYMENT_UPLOADED':
    case 'PAYMENT_VERIFIED':
    case 'PAYMENT_REJECTED':
      return n.data?.paymentId ? `${base}/payments/${n.data.paymentId}/invoice` : `${base}/payments`
    default:
      return base
  }
}

export default function NotificationsPage({ role }: { role: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const base = role === 'admin' ? '/admin' : role === 'finance' ? '/finance' : role === 'candidate' ? '/candidate' : '/affiliate'

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/settings/notifications')
      return data.data
    },
    refetchInterval: 15000,
  })

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/settings/notifications/read')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = notifData?.notifications || []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(base)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-fb-blue">Notifikasi</h1>
        </div>
        {notifications.some((n: any) => !n.isRead) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markReadMutation.mutate()}
            className="text-xs gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-fb-gray-dark">Memuat...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto text-fb-gray-dark/40 mb-3" />
          <p className="text-sm text-fb-gray-dark">Tidak ada notifikasi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => navigate(getNotifRoute(n, role))}
              className={`flex items-start gap-3 p-4 rounded-sm border border-[#009ce1]/10 hover:bg-fb-blue/5 transition-colors cursor-pointer ${!n.isRead ? 'bg-fb-blue/5 border-fb-blue/20' : 'bg-white'}`}
            >
              <div className="h-9 w-9 rounded-sm bg-fb-blue-light flex items-center justify-center text-base flex-shrink-0">
                {notifIcons[n.type] || '🔔'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium'} text-fb-blue`}>{n.title}</p>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-fb-blue flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-fb-gray-dark mt-0.5">{n.message}</p>
                <p className="text-[10px] text-fb-gray-dark/60 mt-2">{formatDateTime(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
