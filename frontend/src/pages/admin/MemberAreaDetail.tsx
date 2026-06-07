import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Users, FileText, MessageSquare, Pin, Lock, Send, Plus, Search, X, Loader2, Paperclip, ThumbsUp, UserPlus, UserCheck, DollarSign, TrendingUp, Crown, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/index'
import { formatDateTime } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function NewPostModal({ isOpen, onClose, areaId }: {
  isOpen: boolean
  onClose: () => void
  areaId: string
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('DISCUSSION')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async () => {
    if (!title || !content) { toast({ title: 'Judul dan konten wajib diisi', variant: 'destructive' }); return }
    setIsPending(true)
    try {
      await api.post(`/member-areas/${areaId}/posts`, { title, content, type })
      queryClient.invalidateQueries({ queryKey: ['area-posts', areaId] })
      toast({ title: 'Post berhasil dibuat' })
      setTitle(''); setContent(''); setType('DISCUSSION')
      onClose()
    } catch (err: any) {
      toast({ title: 'Gagal membuat post', description: err?.response?.data?.message, variant: 'destructive' })
    } finally {
      setIsPending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold">Buat Post Baru</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Judul</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul post..." className="text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipe</Label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009ce1]/20">
              <option value="DISCUSSION">Diskusi</option>
              <option value="ANNOUNCEMENT">Pengumuman</option>
              <option value="SHARED_FILE">File Bersama</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Konten</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Tulis konten..." className="text-xs" rows={8} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
          <Button variant="outline" className="text-xs" onClick={onClose}>Batal</Button>
          <Button className="text-xs" onClick={handleSubmit} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Membuat...</> : 'Buat Post'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CommentSection({ postId, areaId }: { postId: string; areaId: string }) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const { data: commentsData } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => { const { data } = await api.get(`/member-areas/${areaId}/posts/${postId}/comments`); return data },
  })
  const comments = commentsData?.data || []

  const addComment = async () => {
    if (!content.trim()) return
    try {
      await api.post(`/member-areas/${areaId}/posts/${postId}/comments`, { content, parentId: replyTo })
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] })
      queryClient.invalidateQueries({ queryKey: ['area-posts', areaId] })
      setContent('')
      setReplyTo(null)
    } catch (err: any) {
      toast({ title: 'Gagal mengirim komentar', variant: 'destructive' })
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0 mt-0.5">
                {c.user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="bg-slate-50 rounded-lg rounded-tl-none px-3 py-2">
                  <span className="text-[10px] font-semibold text-slate-700">{c.user?.email?.split('@')[0]}</span>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{c.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1.5 px-1">
                  <button className="text-[10px] text-slate-400 hover:text-[#009ce1] transition-colors font-medium" onClick={() => setReplyTo(c.id)}>Balas</button>
                  <span className="text-[10px] text-slate-300">{formatDateTime(c.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[10px] text-[#009ce1] font-medium">Membalas komentar</span>
          <button onClick={() => setReplyTo(null)} className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={replyTo ? 'Balas komentar...' : 'Tulis komentar...'}
          className="h-9 text-xs flex-1 rounded-lg"
          onKeyDown={e => e.key === 'Enter' && addComment()}
        />
        <Button size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={addComment}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function PostCard({ post, areaId }: { post: any; areaId: string }) {
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false)
  const { user } = useAuthStore()

  const addReaction = async (emoji: string) => {
    try {
      await api.post(`/member-areas/${areaId}/posts/${post.id}/reactions`, { emoji })
      queryClient.invalidateQueries({ queryKey: ['area-posts', areaId] })
    } catch {
      toast({ title: 'Gagal menambah reaksi', variant: 'destructive' })
    }
    setReactionMenuOpen(false)
  }

  const removeReaction = async (emoji: string) => {
    try {
      await api.delete(`/member-areas/${areaId}/posts/${post.id}/reactions/${emoji}`)
      queryClient.invalidateQueries({ queryKey: ['area-posts', areaId] })
    } catch {
      toast({ title: 'Gagal menghapus reaksi', variant: 'destructive' })
    }
    setReactionMenuOpen(false)
  }

  const userReactions = post.reactions?.filter((r: any) => r.userId === user?.id) || []

  const typeBadge = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">Pengumuman</span>
      case 'SHARED_FILE': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">File</span>
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/50">Diskusi</span>
    }
  }

  const reactionCounts = post.reactions?.reduce((acc: Record<string, number>, r: any) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div className={`bg-white border transition-all hover:shadow-sm ${post.isPinned ? 'border-[#009ce1]/30 bg-[#009ce1]/[0.01]' : 'border-slate-200/80'} rounded-lg`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#009ce1] to-[#0077b3] flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
            {post.user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-800">{post.user?.email?.split('@')[0]}</span>
              {typeBadge(post.type)}
              {post.isPinned && <Pin className="h-3 w-3 text-amber-500 flex-shrink-0" />}
              {post.isLocked && <Lock className="h-3 w-3 text-red-400 flex-shrink-0" />}
            </div>
            <span className="text-[10px] text-slate-400">{formatDateTime(post.createdAt)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="mt-3 ml-12">
          <h3 className="text-sm font-semibold text-slate-800 leading-snug">{post.title}</h3>
          <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>

        {/* Reaction Summary */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 ml-12">
            {(Object.entries(reactionCounts) as [string, number][]).map(([emoji, count]) => (
              <span key={emoji} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/50 text-xs">
                <span className="text-sm">{emoji}</span>
                <span className="text-[10px] text-slate-500 font-medium">{count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 ml-12">
          <div className="relative">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-500 hover:text-[#009ce1] hover:bg-[#009ce1]/5 transition-all"
              onClick={() => setReactionMenuOpen(!reactionMenuOpen)}
            >
              {userReactions.length > 0 ? (
                <span className="text-sm">{userReactions[0].emoji}</span>
              ) : (
                <ThumbsUp className="h-3.5 w-3.5" />
              )}
              <span>Reaksi</span>
            </button>
            {reactionMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setReactionMenuOpen(false)} />
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-20 flex gap-1">
                  {EMOJIS.map(emoji => {
                    const isActive = userReactions.some((r: any) => r.emoji === emoji)
                    return (
                      <button
                        key={emoji}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg text-lg hover:bg-slate-100 transition-all ${isActive ? 'bg-[#009ce1]/10 ring-1 ring-[#009ce1]/30' : ''}`}
                        onClick={() => isActive ? removeReaction(emoji) : addReaction(emoji)}
                      >
                        {emoji}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-500 hover:text-[#009ce1] hover:bg-[#009ce1]/5 transition-all"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{post._count?.comments || 0} Komentar</span>
          </button>
        </div>

        {/* Comments */}
        {showComments && <CommentSection postId={post.id} areaId={areaId} />}
      </div>
    </div>
  )
}

function InviteModal({ isOpen, onClose, areaId }: {
  isOpen: boolean
  onClose: () => void
  areaId: string
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['available-users', search, selectedRole],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedRole) params.set('role', selectedRole)
      const { data } = await api.get(`/member-areas/users/available?${params}`)
      return data
    },
    enabled: isOpen,
  })

  const { data: membersData } = useQuery({
    queryKey: ['area-members', areaId],
    queryFn: async () => { const { data } = await api.get(`/member-areas/${areaId}/members`); return data },
    enabled: isOpen,
  })
  const existingMemberIds = new Set(membersData?.data?.map((m: any) => m.userId) || [])

  const inviteMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/member-areas/${areaId}/invite`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-members', areaId] })
      queryClient.invalidateQueries({ queryKey: ['area-stats', areaId] })
      toast({ title: 'Member berhasil diundang' })
    },
    onError: (err: any) => toast({ title: 'Gagal mengundang', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  if (!isOpen) return null

  const availableUsers = (usersData?.data || []).filter((u: any) => !existingMemberIds.has(u.id))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-sm font-bold">Undang Member</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari email..."
              className="pl-9 h-9 text-xs border-slate-200 rounded-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009ce1]/20"
          >
            <option value="">Semua Role</option>
            <option value="KANDIDAT">Kandidat</option>
            <option value="AFFILIATE">Affiliate</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#009ce1]" /></div>
          ) : (
            <div className="divide-y divide-slate-50">
              {availableUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                    {u.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{u.email}</p>
                    <p className="text-[10px] text-slate-400">{u.role}</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] rounded-lg"
                    onClick={() => inviteMutation.mutate(u.id)}
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><UserPlus className="h-3 w-3 mr-1" /> Invite</>}
                  </Button>
                </div>
              ))}
              {!availableUsers.length && (
                <div className="px-5 py-12 text-center">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs text-slate-400">Tidak ada user yang tersedia</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${highlight ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      <div className={`flex-shrink-0 ${highlight ? 'text-emerald-600' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs font-semibold leading-tight ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>{value}</p>
        <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
      </div>
    </div>
  )
}

export default function MemberAreaDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'files'>('posts')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: areaData, isLoading: areaLoading } = useQuery({
    queryKey: ['area-by-slug', slug],
    queryFn: async () => { const { data } = await api.get(`/member-areas/slug/${slug}`); return data },
  })
  const area = areaData?.data

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['area-posts', area?.id, page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/member-areas/${area.id}/posts?${params}`)
      return data
    },
    enabled: !!area?.id,
  })

  const { data: membersData } = useQuery({
    queryKey: ['area-members', area?.id],
    queryFn: async () => { const { data } = await api.get(`/member-areas/${area.id}/members`); return data },
    enabled: !!area?.id && activeTab === 'members',
  })

  const { data: statsData } = useQuery({
    queryKey: ['area-stats', area?.id],
    queryFn: async () => { const { data } = await api.get(`/member-areas/${area.id}/stats`); return data },
    enabled: !!area?.id,
  })
  const stats = statsData?.data

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/member-areas/${area?.id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-members', area?.id] })
      queryClient.invalidateQueries({ queryKey: ['area-stats', area?.id] })
      toast({ title: 'Berhasil bergabung ke area' })
    },
    onError: (err: any) => toast({ title: 'Gagal bergabung', description: err?.response?.data?.message, variant: 'destructive' }),
  })

  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/member-areas/${area?.id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-members', area?.id] })
      queryClient.invalidateQueries({ queryKey: ['area-stats', area?.id] })
      toast({ title: 'Berhasil keluar dari area' })
    },
    onError: () => toast({ title: 'Gagal keluar dari area', variant: 'destructive' }),
  })

  const isMember = membersData?.data?.some((m: any) => m.userId === user?.id)

  if (areaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#009ce1]" />
      </div>
    )
  }

  if (!area) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-slate-800">Area tidak ditemukan</h2>
        <Button className="mt-4 text-xs rounded-lg" onClick={() => navigate('/admin/member-areas')}>Kembali</Button>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    if (value === 0) return 'Rp 0'
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`
    if (value >= 1000) return `Rp ${(value / 1000).toFixed(1)}rb`
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  return (
    <div className="min-h-screen space-y-4">
      {/* Back button */}
      <Button variant="ghost" className="text-xs text-slate-500 hover:text-slate-800 -ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Kembali
      </Button>

      {/* Cover & Info */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Cover */}
        {area.coverUrl ? (
          <div className="h-36 bg-cover bg-center relative" style={{ backgroundImage: `url(${area.coverUrl})` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : (
          <div className="h-36 bg-gradient-to-r from-[#009ce1] via-[#0077b3] to-[#005f8a] relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        {/* Info Section */}
        <div className="px-6 pb-6">
          <div className="flex items-start gap-4 -mt-10 relative z-10">
            {area.avatarUrl ? (
              <img src={area.avatarUrl} alt="" className="h-20 w-20 rounded-xl object-cover border-4 border-white shadow-md" />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-white flex items-center justify-center text-[#009ce1] font-bold text-2xl border-4 border-white shadow-md">
                {area.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 pt-10">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{area.name}</h1>
                {area.category && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">{area.category.name}</span>
                )}
              </div>
              {area.description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-2xl">{area.description}</p>}
            </div>
            <div className="flex gap-2 pt-10 flex-shrink-0">
              {!isMember ? (
                <Button className="text-xs rounded-lg px-4" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending}>
                  {joinMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Bergabung...</> : 'Bergabung'}
                </Button>
              ) : (
                <Button variant="outline" className="text-xs rounded-lg" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
                  Keluar
                </Button>
              )}
              {isMember && (
                <Button className="text-xs rounded-lg gap-1.5" onClick={() => setNewPostOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Post
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-5">
            <StatCard icon={<Users className="h-4 w-4" />} label="Member" value={`${stats?.memberCount || 0}`} />
            <StatCard icon={<FileText className="h-4 w-4" />} label="Post" value={`${stats?.postCount || 0}`} />
            <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Komentar" value={`${stats?.commentCount || 0}`} />
            <StatCard icon={<UserCheck className="h-4 w-4" />} label="Kandidat" value={`${stats?.totalReferrals || 0}`} highlight />
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="Pendapatan" value={formatCurrency(stats?.totalReferralRevenue || 0)} highlight />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-100 px-6">
          {(['posts', 'members', 'files'] as const).map(tab => (
            <button
              key={tab}
              className={`px-4 py-3 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab
                  ? 'text-[#009ce1] border-[#009ce1]'
                  : 'text-slate-400 hover:text-slate-600 border-transparent hover:border-slate-200'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'posts' ? 'Post' : tab === 'members' ? 'Member' : 'Files'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari post..."
              className="pl-10 h-10 text-xs border-slate-200 rounded-lg bg-white"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          {/* Posts */}
          {postsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-200/80 p-5 animate-pulse">
                  <div className="flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-24" />
                      <div className="h-4 bg-slate-100 rounded w-48" />
                      <div className="h-3 bg-slate-100 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {postsData?.posts?.map((post: any) => (
                <PostCard key={post.id} post={post} areaId={area.id} />
              ))}
              {!postsData?.posts?.length && (
                <div className="bg-white rounded-lg border border-slate-200/80 p-16 text-center">
                  <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Belum ada post</p>
                  <p className="text-xs text-slate-400 mt-1">Jadilah yang pertama membuat post!</p>
                </div>
              )}

              {/* Pagination */}
              {postsData?.pagination && postsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
                  <span className="text-xs font-semibold text-slate-700 px-3 py-1 bg-white rounded-lg border border-slate-200">{page} / {postsData.pagination.totalPages}</span>
                  <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" disabled={page >= postsData.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Daftar Member <span className="text-xs font-normal text-slate-400">({membersData?.data?.length || 0})</span></h3>
            <Button size="sm" className="h-8 text-xs rounded-lg gap-1.5" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Undang Member
            </Button>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-6 py-2.5 border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <div className="col-span-4">Member</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2 text-center">Kandidat Diajak</div>
            <div className="col-span-2 text-right">Pendapatan</div>
            <div className="col-span-2 text-center">Status</div>
          </div>

          <div className="divide-y divide-slate-50">
            {membersData?.data?.map((m: any) => (
              <div key={m.id} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 px-6 py-3 hover:bg-slate-50/60 transition-colors">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#009ce1] to-[#0077b3] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {m.user?.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{m.user?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.user?.email}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  {m.role === 'OWNER' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                      <Crown className="h-3 w-3" /> Owner
                    </span>
                  ) : m.role === 'ADMIN' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/50">
                      Member
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-800">{m.referralCount || 0}</span>
                    <span className="text-[10px] text-slate-400 block">kandidat</span>
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <div className="text-right">
                    <span className={`text-sm font-bold ${m.referralRevenue > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {m.referralRevenue > 0 ? formatCurrency(m.referralRevenue) : 'Rp 0'}
                    </span>
                    {m.referralRevenue > 0 && <TrendingUp className="h-3 w-3 text-emerald-500 inline ml-1" />}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-center">
                  {m.affiliateCode ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                      Affiliate
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300">-</span>
                  )}
                </div>
              </div>
            ))}
            {!membersData?.data?.length && (
              <div className="px-6 py-16 text-center">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">Belum ada member</p>
                <p className="text-xs text-slate-400 mt-1">Klik "Undang Member" untuk menambahkan</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200/80 p-16 text-center">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Paperclip className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">Belum ada file</p>
        </div>
      )}

      <NewPostModal isOpen={newPostOpen} onClose={() => setNewPostOpen(false)} areaId={area.id} />
      <InviteModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} areaId={area.id} />
    </div>
  )
}
