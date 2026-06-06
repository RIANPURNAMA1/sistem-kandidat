import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/index'
import { formatDateTime } from '@/lib/utils'
import api from '@/services/api'

export default function AdminAuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => { const { data } = await api.get('/settings/audit-logs?limit=100'); return data },
  })
  const actionColors: Record<string, string> = {
    LOGIN: 'bg-blue-100 text-blue-800', LOGOUT: 'bg-gray-100 text-gray-800',
    CREATE: 'bg-green-100 text-green-800', UPDATE: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800', APPROVE: 'bg-teal-100 text-teal-800',
    REJECT: 'bg-red-100 text-red-800', UPLOAD: 'bg-purple-100 text-purple-800',
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Riwayat seluruh aktivitas sistem</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4 text-left border border-slate-200">Waktu</th>
              <th className="px-6 py-4 text-left border border-slate-200">User</th>
              <th className="px-6 py-4 text-left border border-slate-200">Aksi</th>
              <th className="px-6 py-4 text-left border border-slate-200">Resource</th>
              <th className="px-6 py-4 text-left border border-slate-200">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(10)].map((_,i) => (
              <tr key={i} className="animate-pulse">
                {[...Array(5)].map((_,j) => <td key={j} className="px-6 py-4 border border-slate-200"><div className="h-4 bg-slate-100 rounded w-20" /></td>)}
              </tr>
            ))}
            {data?.data?.map((log: any) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap border border-slate-200 font-mono text-[10px]">{formatDateTime(log.createdAt)}</td>
                <td className="px-6 py-4 font-semibold text-slate-900 border border-slate-200">{log.user?.email || 'System'}</td>
                <td className="px-6 py-4 border border-slate-200">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-tighter ${actionColors[log.action] || 'bg-slate-100 text-slate-800'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-slate-400 border border-slate-200">{log.resource}</td>
                <td className="px-6 py-4 font-mono text-slate-400 border border-slate-200">{log.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
