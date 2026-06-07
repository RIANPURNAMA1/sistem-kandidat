import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Users, FileText, Globe, Lock, UserPlus, Loader2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/index'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

export default function MemberAreasBrowsePage({ role }: { role: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['browse-member-areas', search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const { data } = await api.get(`/member-areas?${params}`)
      return data
    },
  })

  const { data: myAreasData } = useQuery({
    queryKey: ['my-member-areas'],
    queryFn: async () => { const { data } = await api.get('/member-areas/my'); return data },
  })
  const myAreaIds = new Set(myAreasData?.data?.map((m: any) => m.areaId) || [])

  const joinMutation = useMutation({
    mutationFn: (areaId: string) => api.post(`/member-areas/${areaId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-member-areas'] })
      toast({ title: 'Berhasil bergabung ke area' })
    },
    onError: (err: any) => toast({ title: 'Gagal bergabung', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const visibilityIcon = (v: string) => {
    switch (v) {
      case 'PUBLIC': return <Globe className="h-3.5 w-3.5" />
      case 'PRIVATE': return <Lock className="h-3.5 w-3.5" />
      case 'INVITE_ONLY': return <UserPlus className="h-3.5 w-3.5" />
      default: return <Lock className="h-3.5 w-3.5" />
    }
  }

  return (
    <div className="min-h-screen space-y-4">
      {/* Header */}
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6">
        <h1 className="text-lg font-bold text-slate-800">Member Area</h1>
        <p className="text-xs text-slate-500 mt-1">Bergabung dengan komunitas dan diskusi bersama member lainnya</p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari area..."
            className="pl-9 h-9 text-xs border-slate-200 bg-slate-50"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* My Areas */}
      {myAreasData?.data?.length > 0 && (
        <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-800">Area Saya</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {myAreasData.data.map((m: any) => (
              <button
                key={m.areaId}
                className="text-left rounded-sm border border-slate-200 p-4 hover:border-[#009ce1]/30 hover:bg-[#009ce1]/[0.02] transition-all"
                onClick={() => navigate(`/${role}/member-areas/${m.area.slug}`)}
              >
                <div className="flex items-center gap-3">
                  {m.area.avatarUrl ? (
                    <img src={m.area.avatarUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-[#009ce1]/10 flex items-center justify-center text-[#009ce1] font-bold">
                      {m.area.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{m.area.name}</p>
                    <p className="text-[10px] text-slate-400">{m.area._count?.members || 0} member</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All Areas */}
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-800">Semua Area</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-32" />
                    <div className="h-2 bg-slate-100 rounded w-48" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            data?.data?.map((area: any) => {
              const isMember = myAreaIds.has(area.id)
              return (
                <div key={area.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-4">
                    {area.avatarUrl ? (
                      <img src={area.avatarUrl} alt="" className="h-12 w-12 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-[#009ce1]/10 flex items-center justify-center text-[#009ce1] font-bold flex-shrink-0">
                        {area.name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{area.name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          {visibilityIcon(area.visibility)}
                          {area.visibility === 'PUBLIC' ? 'Public' : area.visibility === 'PRIVATE' ? 'Private' : 'Invite Only'}
                        </span>
                      </div>
                      {area.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{area.description}</p>}
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {area._count?.members || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {area._count?.posts || 0}
                        </span>
                        {area.category && <span className="text-[10px] text-slate-400">{area.category.name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {isMember ? (
                        <Button size="sm" className="text-xs" onClick={() => navigate(`/${role}/member-areas/${area.slug}`)}>
                          Masuk
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => joinMutation.mutate(area.id)} disabled={joinMutation.isPending || area.visibility === 'INVITE_ONLY'}>
                          {joinMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Gabung'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {!isLoading && !data?.data?.length && (
            <div className="px-5 py-14 text-center">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Belum ada member area</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
