import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Eye, Filter, SlidersHorizontal,
  LayoutGrid, List, ChevronLeft, ChevronRight,
  MoreVertical, Clock, DollarSign, Activity, Grid, Trash2,
  Download, RefreshCw
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import api from '@/services/api'

// Badge style per status — pastel sesuai gambar
const getStatusBadgeStyle = (isActive: boolean) => {
  if (isActive) return 'bg-emerald-50 text-emerald-600 border border-emerald-100'
  return 'bg-rose-50 text-rose-500 border border-rose-100'
}

const TAB_STATUS_MAP: Record<string, string | undefined> = {
  All: undefined,
  Aktif: 'active',
  Nonaktif: 'inactive',
  Diproses: 'processing',
}

export default function AdminCandidates() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('All')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-candidates', page, search, activeTab, filterStatus, filterStart, filterEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const tabStatus = TAB_STATUS_MAP[activeTab]
      if (tabStatus) params.set('status', tabStatus)
      if (filterStatus) params.set('status', filterStatus)
      if (filterStart) params.set('startDate', filterStart)
      if (filterEnd) params.set('endDate', filterEnd)
      const { data } = await api.get(`/candidates?${params}`)
      return data
    },
  })

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (!data?.data?.length) return
    if (selected.size === data.data.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.data.map((c: any) => c.id)))
    }
  }, [data, selected])

  const tabs = ['All', 'Aktif', 'Nonaktif', 'Diproses']

  return (
    <div className=" min-h-screen">
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">

        {/* ── Toolbar Atas ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-[17px] font-semibold text-slate-800">Candidates</h2>

            {/* Pagination */}
            <span className="text-sm text-slate-400">
              {page} of {data?.pagination?.totalPages || 1}
            </span>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
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

            {/* View toggle */}
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Button variant="outline" size="sm"
                className={`h-9 text-sm font-medium rounded-lg ${showFilters ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600'}`}
                onClick={() => { setShowFilters(!showFilters); setShowManage(false) }}>
                <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
              </Button>
              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-[500px] bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                      <div className="flex items-center gap-1">
                        {['', 'active', 'inactive'].map(s => (
                          <button key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${filterStatus === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                            {s === '' ? 'Semua' : s === 'active' ? 'Aktif' : 'Nonaktif'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dari Tanggal</label>
                      <Input type="date" value={filterStart}
                        onChange={e => setFilterStart(e.target.value)}
                        className="h-9 text-xs rounded-lg border-slate-200 w-40" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sampai Tanggal</label>
                      <Input type="date" value={filterEnd}
                        onChange={e => setFilterEnd(e.target.value)}
                        className="h-9 text-xs rounded-lg border-slate-200 w-40" />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button size="sm" className="h-9 text-xs rounded-lg"
                        onClick={() => { setFilterStatus(''); setFilterStart(''); setFilterEnd(''); setPage(1) }}>
                        Reset
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 text-xs rounded-lg border-slate-200"
                        onClick={() => { setShowFilters(false); setPage(1) }}>
                        Terapkan
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selected.size > 0 && (
              <Button variant="outline" size="sm"
                className="h-9 text-sm font-medium border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                onClick={async () => {
                  for (const id of selected) {
                    await api.delete(`/candidates/${id}`).catch(() => {})
                  }
                  toast({ title: 'Berhasil', description: `${selected.size} kandidat dihapus` })
                  setSelected(new Set())
                  refetch()
                }}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hapus ({selected.size})
              </Button>
            )}

            <div className="relative">
              <Button variant="outline" size="sm"
                className="h-9 text-sm font-medium border-slate-200 text-slate-600 rounded-lg"
                onClick={() => { setShowManage(!showManage); setShowFilters(false) }}>
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Manage
              </Button>
              {showManage && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                  <button className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    onClick={async () => {
                      setShowManage(false)
                      try {
                        const { data } = await api.get('/candidates?limit=10000')
                        const headers = ['Nama', 'NIK', 'Telepon', 'Email', 'Status', 'Affiliate', 'Terdaftar']
                        const rows = data.data.map((c: any) => [
                          c.fullName, c.nik, c.phone, c.user?.email,
                          c.user?.isActive ? 'Aktif' : 'Nonaktif',
                          c.affiliate?.user?.email || '-',
                          formatDate(c.createdAt)
                        ])
                        const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `kandidat-${new Date().toISOString().slice(0, 10)}.csv`
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
                  <div className="border-t border-slate-100 my-1" />
                  <button className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={() => {
                      setShowManage(false)
                      if (selected.size === 0) { toast({ title: 'Pilih kandidat terlebih dahulu' }); return }
                      toast({ title: `${selected.size} kandidat akan dinonaktifkan` })
                    }}>
                    <Activity className="h-3.5 w-3.5" /> Nonaktifkan Massal
                  </button>
                </div>
              )}
            </div>

            {showManage && <div className="fixed inset-0 z-10" onClick={() => setShowManage(false)} />}
            {showFilters && <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />}
          </div>
        </div>

        {/* ── Toolbar Bawah: Tabs + Search ── */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1) }}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${activeTab === tab
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search..."
              className="pl-9 h-9 w-52 rounded-lg text-[13px] border-slate-200 bg-slate-50 shadow-none
                         focus-visible:ring-1 focus-visible:ring-indigo-100 focus-visible:border-indigo-300"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="w-11 pl-5 py-3.5 text-center border border-slate-100 bg-slate-50/50">
                  <input type="checkbox"
                    checked={data?.data?.length > 0 && selected.size === data.data.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-500 cursor-pointer" />
                </th>
                {/* Kolom dengan ikon kecil seperti gambar */}
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <Grid className="h-3 w-3" /> Nama Lengkap
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Telepon
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Affiliate
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <Clock className="h-3 w-3" /> Terdaftar
                  </span>
                </th>
                <th className="px-4 py-3.5 text-center border border-slate-100 bg-slate-50/50">
                  <span className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <Activity className="h-3 w-3" /> Status
                  </span>
                </th>
                <th className="px-4 py-3.5 border border-slate-100 bg-slate-50/50" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50 bg-white">

              {/* Loading skeleton */}
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="pl-5 py-4 border border-slate-100"><div className="h-4 w-4 bg-slate-100 rounded mx-auto" /></td>
                  <td className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                  <td className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                  <td className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                  <td className="px-4 py-4 border border-slate-100"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                  <td className="px-4 py-4 border border-slate-100"><div className="h-5 bg-slate-100 rounded-md w-16 mx-auto" /></td>
                  <td className="px-4 py-4 border border-slate-100"><div className="h-4 w-4 bg-slate-100 rounded ml-auto" /></td>
                </tr>
              ))}

              {/* Data rows */}
              {data?.data?.map((c: any) => (
                <tr key={c.id} className={`hover:bg-slate-50/60 transition-colors ${selected.has(c.id) ? 'bg-indigo-50/40' : ''}`}>
                  <td className="pl-5 py-[13px] text-center border border-slate-100">
                    <input type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-indigo-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <div className="font-semibold text-slate-800">{c.fullName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.nik}</div>
                  </td>
                  <td className="px-4 py-[13px] text-slate-600 border border-slate-100">{c.phone}</td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    {c.affiliate ? (
                      <div>
                        <span className="block text-slate-700">{c.affiliate.user?.email}</span>
                        <span className="text-xs text-slate-400">{c.affiliate.code}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 italic text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-[13px] text-slate-500 text-[13px] border border-slate-100">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-[13px] text-center border border-slate-100">
                    <span className={`inline-flex px-3 py-1 rounded-md text-xs font-semibold
                      ${getStatusBadgeStyle(c.user?.isActive)}`}>
                      {c.user?.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-[13px] border border-slate-100">
                    <div className="flex justify-end items-center gap-1">
                      <Link to={`/admin/candidates/${c.id}`}>
                        <Button size="icon" variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <div className="relative">
                        <Button size="icon" variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {menuOpen === c.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-md shadow-lg z-10 py-1">
                            <button
                              className="w-full px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50"
                              onClick={() => { setMenuOpen(null); toast({ title: 'Edit kandidat' }) }}>
                              Edit
                            </button>
                            <button
                              className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50"
                              onClick={() => { setMenuOpen(null); toast({ title: 'Kandidat dinonaktifkan' }) }}>
                              Nonaktifkan
                            </button>
                          </div>
                        )}
                        {menuOpen === c.id && (
                          <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Empty state */}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-400 border border-slate-100">
                    Tidak ada data kandidat ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}