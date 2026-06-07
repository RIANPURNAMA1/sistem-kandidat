import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/index'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Plus, X, Copy, ChevronDown, ChevronUp, Search, Grid, Download, RefreshCw, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/services/api'

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin

export default function AdminAffiliatesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAddProgram, setShowAddProgram] = useState<string | null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [showManage, setShowManage] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-affiliates', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const { data } = await api.get(`/affiliates?${params}`)
      return data
    },
  })

  const { data: allPrograms } = useQuery({
    queryKey: ['all-programs'],
    queryFn: async () => { const { data } = await api.get('/programs?limit=100'); return data },
  })

  const { data: affiliatePrograms } = useQuery({
    queryKey: ['admin-affiliate-programs', expanded],
    queryFn: async () => {
      if (!expanded) return {}
      const { data } = await api.get(`/affiliates/${expanded}/programs`)
      return { affiliateId: expanded, programs: data.data || [] }
    },
    enabled: !!expanded,
  })

  const { data: formsData } = useQuery({
    queryKey: ['form-settings'],
    queryFn: async () => {
      const { data } = await api.get('/checkout')
      return data.data || []
    },
  })
  const registerForm = formsData?.find((f: any) => f.formType === 'REGISTER' && f.isActive)

  const addMutation = useMutation({
    mutationFn: async ({ affiliateId, programId }: { affiliateId: string; programId: string }) => {
      const { data } = await api.post(`/affiliates/${affiliateId}/programs`, { programId })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-programs'] })
      toast({ title: 'Program berhasil ditambahkan' })
      setSelectedProgramId('')
      setShowAddProgram(null)
    },
    onError: (err: any) => {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Terjadi kesalahan', variant: 'destructive' })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async ({ affiliateId, programId }: { affiliateId: string; programId: string }) => {
      await api.delete(`/affiliates/${affiliateId}/programs/${programId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-programs'] })
      toast({ title: 'Program berhasil dihapus' })
    },
    onError: (err: any) => {
      toast({ title: 'Gagal', description: err?.response?.data?.message || 'Terjadi kesalahan', variant: 'destructive' })
    },
  })

  const programsList = allPrograms?.data || []
  const expandedPrograms = (affiliatePrograms as any)?.programs || []
  const availableForExpanded = programsList.filter(
    (p: any) => !expandedPrograms.some((ep: any) => ep.id === p.id)
  )

  return (
    <div className="min-h-screen space-y-5">
      <div>
        <h1 className="text-lg font-bold">Manajemen Affiliate</h1>
        <p className="text-xs text-slate-500 mt-0.5">Kelola data affiliate dan komisi referral</p>
      </div>
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">

        {/* ── Toolbar Atas ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-semibold text-slate-800">Affiliate</h2>
            <span className="text-xs text-slate-400">
              {page} of {data?.pagination?.totalPages || 1}
            </span>
            <div className="flex border border-slate-200 rounded-sm overflow-hidden bg-slate-50">
              <button
                className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <div className="w-px bg-slate-200" />
              <button
                className="px-2 py-1.5 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                disabled={page >= (data?.pagination?.totalPages || 1)}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="outline" size="sm"
                className="h-9 text-xs font-medium border-slate-200 text-slate-600 rounded-sm"
                onClick={() => setShowManage(!showManage)}>
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Manage
              </Button>
              {showManage && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-sm shadow-lg z-20 py-1">
                  <button className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    onClick={async () => {
                      setShowManage(false)
                      try {
                        const { data } = await api.get('/affiliates?limit=10000')
                        const headers = ['Kode', 'Email', 'Klik', 'Registrasi', 'Paid', 'Total Komisi']
                        const rows = data.data.map((a: any) => [a.code, a.user?.email, a.totalClicks, a.totalRegistrations, a.totalPaid, a.totalCommission])
                        const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `affiliate-${new Date().toISOString().slice(0, 10)}.csv`
                        a.click(); URL.revokeObjectURL(url)
                        toast({ title: 'CSV berhasil diexport' })
                      } catch { toast({ title: 'Gagal export CSV' }) }
                    }}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                  <button className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    onClick={() => { setShowManage(false); refetch(); toast({ title: 'Data diperbarui' }) }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
                  </button>
                </div>
              )}
              {showManage && <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />}
            </div>
          </div>
        </div>

        {/* ── Toolbar Bawah: Search ── */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Total <span className="font-semibold text-slate-700">{data?.pagination?.total || 0}</span> affiliate
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari affiliate..."
              className="pl-9 h-9 w-52 rounded-sm text-xs border-slate-200 bg-slate-50 shadow-none focus-visible:ring-1 focus-visible:ring-[#009ce1]/20 focus-visible:border-[#009ce1]"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-10 px-4 py-3.5 text-center border border-slate-100 bg-slate-50/50"></th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Grid className="h-3 w-3" /> Kode
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Klik</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registrasi</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Paid</span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Komisi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-20" /></td>)}
                </tr>
              ))}
              {data?.data?.map((a: any) => (
                <React.Fragment key={a.id}>
                  <tr
                    className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  >
                    <td className="px-4 py-[13px] text-center border border-slate-100">
                      {expanded === a.id
                        ? <ChevronUp className="h-4 w-4 inline text-slate-400" />
                        : <ChevronDown className="h-4 w-4 inline text-slate-400" />
                      }
                    </td>
                    <td className="px-4 py-[13px] font-mono font-semibold text-[#009ce1] border border-slate-100">{a.code}</td>
                    <td className="px-4 py-[13px] text-slate-600 border border-slate-100">{a.user?.email}</td>
                    <td className="px-4 py-[13px] text-slate-600 border border-slate-100">{a.totalClicks?.toLocaleString()}</td>
                    <td className="px-4 py-[13px] text-slate-600 border border-slate-100">{a.totalRegistrations?.toLocaleString()}</td>
                    <td className="px-4 py-[13px] text-slate-600 border border-slate-100">{a.totalPaid?.toLocaleString()}</td>
                    <td className="px-4 py-[13px] font-semibold text-slate-800 border border-slate-100">{formatCurrency(a.totalCommission)}</td>
                  </tr>
                  {expanded === a.id && (
                    <tr key={`${a.id}-programs`}>
                      <td colSpan={7} className="bg-slate-50/50 px-8 py-5 border border-slate-100">
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program Affiliate Aktif</p>
                          <div className="grid gap-3">
                            {expandedPrograms.length === 0 && (
                              <p className="text-xs text-slate-400 italic">Belum ada program yang diaktifkan untuk affiliate ini.</p>
                            )}
                            {expandedPrograms.map((p: any) => {
                              const formSlug = registerForm?.slug || ''
                              const formPath = formSlug ? `/checkout/${formSlug}` : '/register'
                              return (
                                <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-sm px-4 py-3">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800">{p.name}</p>
                                    {p.fee && <p className="text-xs font-medium text-[#009ce1]">{formatCurrency(p.fee)}</p>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-3 py-1.5 gap-2">
                                      <span className="text-[10px] text-slate-400 font-mono">Link:</span>
                                      <input
                                        readOnly
                                        value={`${BASE_URL}${formPath}?ref=${a.code}&programId=${p.id}`}
                                        className="bg-transparent text-[10px] font-mono text-slate-600 border-0 outline-none w-52"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded border-slate-200"
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${BASE_URL}${formPath}?ref=${a.code}&programId=${p.id}`)
                                        toast({ title: 'Link disalin!' })
                                      }}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <button
                                      onClick={() => removeMutation.mutate({ affiliateId: a.id, programId: p.id })}
                                      className="h-8 w-8 rounded hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="pt-2">
                            {showAddProgram === a.id ? (
                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-sm p-3">
                                <select
                                  value={selectedProgramId}
                                  onChange={(e) => setSelectedProgramId(e.target.value)}
                                  className="flex-1 h-9 rounded border border-slate-200 px-3 text-xs outline-none focus:border-[#009ce1] transition-colors"
                                >
                                  <option value="">Pilih program untuk ditambahkan...</option>
                                  {availableForExpanded.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="h-9 rounded px-4 text-xs"
                                    disabled={!selectedProgramId || addMutation.isPending}
                                    onClick={() => addMutation.mutate({ affiliateId: a.id, programId: selectedProgramId })}
                                  >
                                    {addMutation.isPending ? 'Menambahkan...' : 'Tambah'}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-9 rounded px-4 text-xs" onClick={() => { setShowAddProgram(null); setSelectedProgramId('') }}>
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" className="h-8 rounded border-slate-200 text-xs" onClick={() => setShowAddProgram(a.id)}>
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Aktifkan Program Baru
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-xs text-slate-400 border border-slate-100">
                    Tidak ada data affiliate ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {data?.pagination && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
            <p className="text-xs text-slate-400">
              Total <span className="font-semibold text-slate-700">{data.pagination.total}</span> affiliate
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 rounded border-slate-200 text-slate-500 text-xs"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
              <span className="text-xs font-semibold text-slate-700 bg-slate-50 h-7 w-10 flex items-center justify-center rounded border border-slate-200">{page}</span>
              <Button size="sm" variant="outline" className="h-7 rounded border-slate-200 text-slate-500 text-xs"
                disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}