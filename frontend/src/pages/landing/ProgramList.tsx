import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input, Card, CardContent } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatCurrency, getStatusColor } from '@/lib/utils'
import api from '@/services/api'

export default function ProgramList() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: async () => { const { data } = await api.get('/programs/categories'); return data.data } })
  const { data, isLoading } = useQuery({
    queryKey: ['programs', search, categoryId],
    queryFn: async () => { const { data } = await api.get(`/programs?search=${search}&categoryId=${categoryId}&limit=20`); return data }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Program Kami</h1>
        <p className="text-muted-foreground">Temukan program yang sesuai dengan impian Anda</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-8 justify-center">
        <button onClick={() => setCategoryId('')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!categoryId ? 'bg-fb-blue text-white' : 'bg-fb-gray text-muted-foreground hover:bg-fb-gray-light'}`}>Semua</button>
        {categories?.map((c: any) => (
          <button key={c.id} onClick={() => setCategoryId(c.id)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${categoryId === c.id ? 'bg-fb-blue text-white' : 'bg-fb-gray text-muted-foreground hover:bg-fb-gray-light'}`}>{c.name}</button>
        ))}
      </div>
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari program..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.data?.map((p: any) => (
          <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-40 bg-gradient-to-br from-fb-blue to-blue-700 flex items-center justify-center">
              <span className="text-4xl font-bold text-white/50">{p.category?.name?.[0] || 'P'}</span>
            </div>
            <CardContent className="p-5">
              <p className="text-xs text-fb-blue font-medium mb-1">{p.category?.name}</p>
              <h3 className="font-bold text-base mb-2">{p.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.description}</p>
              <div className="flex justify-between items-center mb-4">
                <div><p className="text-xs text-muted-foreground">Biaya</p><p className="font-bold text-fb-blue">{formatCurrency(p.fee)}</p></div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Durasi</p><p className="font-semibold text-sm">{p.duration}</p></div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>{p.status}</span>
                <Link to={`/programs/${p.slug}`}><Button size="sm">Detail</Button></Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {isLoading && [...Array(6)].map((_, i) => <Card key={i} className="h-64 animate-pulse" />)}
      </div>
    </div>
  )
}
