import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Globe, Star, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/index'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-fb-blue">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data: programs } = useQuery({
    queryKey: ['featured-programs'],
    queryFn: async () => {
      const { data } = await api.get('/programs?featured=true&limit=3')
      return data.data
    },
  })
  const { data: testimonials } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data } = await api.get('/settings/testimonials')
      return data.data
    },
  })
  const { data: faqs } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data } = await api.get('/settings/faqs')
      return data.data
    },
  })

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-fb-blue via-blue-700 to-indigo-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Program Aktif Tersedia Sekarang
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Wujudkan Impian<br />
              <span className="text-yellow-300">Kerja Luar Negeri</span><br />
              Bersama Kami
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl">
              Platform terpercaya untuk pendaftaran program kerja ke Jepang, Korea, Jerman dan berbagai negara lainnya. Proses transparan, cepat, dan profesional.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold text-base px-8" onClick={() => navigate('/login')}>
                Masuk <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-base px-8" onClick={() => navigate('/programs')}>
                Lihat Program
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="2,500+" label="Kandidat Berhasil" />
            <StatCard value="15+" label="Negara Tujuan" />
            <StatCard value="98%" label="Tingkat Kepuasan" />
            <StatCard value="10 Tahun" label="Pengalaman" />
          </div>
        </div>
      </section>

      {/* Featured Programs */}
      <section className="py-16 bg-fb-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Program Unggulan</h2>
            <p className="text-muted-foreground">Pilih program yang sesuai dengan keahlian dan impian Anda</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {programs?.map((program: any) => (
              <Card key={program.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                <div className="h-48 bg-gradient-to-br from-fb-blue to-blue-700 flex items-center justify-center">
                  <Globe className="h-16 w-16 text-white/70" />
                </div>
                <CardContent className="p-6">
                  <div className="text-xs text-fb-blue font-medium mb-2">{program.category?.name}</div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-fb-blue transition-colors">{program.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{program.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Biaya Program</div>
                      <div className="font-bold text-fb-blue">{formatCurrency(program.fee)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Durasi</div>
                      <div className="font-semibold text-sm">{program.duration}</div>
                    </div>
                  </div>
                  <Link to={`/programs/${program.slug}`}>
                    <Button className="w-full" variant="outline">Lihat Detail</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {!programs?.length && [1,2,3].map(i => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-48 bg-fb-gray" />
                <CardContent className="p-6">
                  <div className="h-4 bg-fb-gray rounded mb-2 w-1/3" />
                  <div className="h-6 bg-fb-gray rounded mb-4" />
                  <div className="h-4 bg-fb-gray rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/programs"><Button size="lg" variant="outline">Lihat Semua Program <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Cara Pendaftaran</h2>
            <p className="text-muted-foreground">Proses pendaftaran yang mudah dan transparan</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', icon: '1', title: 'Buat Akun', desc: 'Daftar akun dan lengkapi profil kandidat Anda' },
              { step: '02', icon: '2', title: 'Pilih Program', desc: 'Pilih program yang sesuai dengan keinginan Anda' },
              { step: '03', icon: '3', title: 'Bayar Biaya', desc: 'Lakukan pembayaran dan upload bukti transfer' },
              { step: '04', icon: '4', title: 'Berangkat!', desc: 'Ikuti pelatihan dan siap berangkat ke negara tujuan' },
            ].map(item => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 bg-fb-blue-light rounded-full flex items-center justify-center text-2xl font-bold text-fb-blue mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-xs font-bold text-fb-blue bg-fb-blue-light rounded-full w-6 h-6 flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-fb-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Testimoni Peserta</h2>
            <p className="text-muted-foreground">Cerita sukses mereka yang telah bergabung bersama kami</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials?.map((t: any) => (
              <Card key={t.id} className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 italic">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-fb-blue-light flex items-center justify-center font-bold text-fb-blue">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.position}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Pertanyaan Umum</h2>
          </div>
          <div className="space-y-4">
            {faqs?.map((faq: any) => (
              <details key={faq.id} className="border border-fb-gray-light rounded-lg p-4 group">
                <summary className="flex items-center justify-between cursor-pointer font-medium">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 flex-shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-fb-blue to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap Memulai Perjalanan Anda?</h2>
          <p className="text-blue-100 text-lg mb-8">Bergabunglah dengan ribuan kandidat sukses yang telah bekerja di luar negeri bersama mendunia.id</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold" onClick={() => navigate('/login')}>
              Mulai Sekarang <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => navigate('/programs')}>
              Jelajahi Program
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
