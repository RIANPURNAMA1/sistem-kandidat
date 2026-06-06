import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/index'
import { Settings, Mail, MessageSquare, CreditCard, Globe, ScanLine, Tag, Gift, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmailSettingsForm from './EmailSettingsForm'
import WhatsAppSettingsForm from './WhatsAppSettingsForm'
import RekeningSettingsForm from './RekeningSettingsForm'
import AffiliateSettingsForm from './AffiliateSettingsForm'
import CheckoutSettingsForm from './CheckoutSettingsForm'

const sections = [
  { icon: Globe, label: 'Pengaturan Website', desc: 'Nama situs, tagline, alamat, kontak' },
  { icon: ScanLine, label: 'Pengaturan OCR', desc: 'Threshold confidence, auto-verifikasi' },
  { icon: MessageSquare, label: 'Pengaturan WhatsApp', desc: 'API gateway, template pesan' },
  { icon: Mail, label: 'Pengaturan Email', desc: 'SMTP, template email notifikasi' },
  { icon: CreditCard, label: 'Pengaturan Rekening', desc: 'Rekening tujuan pembayaran' },
  { icon: Settings, label: 'Pengaturan Affiliate', desc: 'Minimum pencairan, komisi default' },
  { icon: ShoppingCart, label: 'Pengaturan Checkout', desc: 'Form pendaftaran/checkout kandidat' },
  { icon: Tag, label: 'Kupon Diskon', desc: 'Kelola kode kupon dan diskon' },
  { icon: Gift, label: 'Reward', desc: 'Kelola reward dan penukaran poin affiliate' },
]

export default function AdminSettingsPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const handleSectionClick = (label: string) => {
    if (label === 'Kupon Diskon') {
      navigate('/admin/coupons')
      return
    }
    if (label === 'Reward') {
      navigate('/admin/rewards')
      return
    }
    setActiveSection(label)
  }

  if (activeSection === 'Pengaturan Checkout') {
    return (
      <div className="space-y-6">
        <CheckoutSettingsForm />
      </div>
    )
  }

  if (activeSection === 'Pengaturan Email') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveSection(null)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          ← Kembali
        </button>
        <div>
          <h1 className="text-lg font-bold">Pengaturan Email</h1>
            <p className="text-xs text-muted-foreground">SMTP, template email notifikasi</p>
        </div>
        <EmailSettingsForm />
      </div>
    )
  }

  if (activeSection === 'Pengaturan Rekening') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveSection(null)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          ← Kembali
        </button>
        <div>
          <h1 className="text-lg font-bold">Pengaturan Rekening</h1>
            <p className="text-xs text-muted-foreground">Rekening tujuan pembayaran kandidat</p>
        </div>
        <RekeningSettingsForm />
      </div>
    )
  }

  if (activeSection === 'Pengaturan Affiliate') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveSection(null)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          ← Kembali
        </button>
        <div>
          <h1 className="text-lg font-bold">Pengaturan Affiliate</h1>
            <p className="text-xs text-muted-foreground">Minimum pencairan, komisi default</p>
        </div>
        <AffiliateSettingsForm />
      </div>
    )
  }

  if (activeSection === 'Pengaturan WhatsApp') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveSection(null)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          ← Kembali
        </button>
        <div>
          <h1 className="text-lg font-bold">Pengaturan WhatsApp</h1>
            <p className="text-xs text-muted-foreground">API gateway, start/stop sender, template pesan</p>
        </div>
        <WhatsAppSettingsForm />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">Pengaturan Sistem</h1>
        <p className="text-xs text-muted-foreground">Konfigurasi semua modul sistem</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(s => (
          <Card
            key={s.label}
            className={`hover:shadow-md transition-shadow cursor-pointer group ${s.label === 'Pengaturan Email' ? 'ring-2 ring-indigo-200' : ''}`}
            onClick={() => handleSectionClick(s.label)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-fb-blue-light rounded-lg flex items-center justify-center group-hover:bg-fb-blue/20 transition-colors">
                  <s.icon className="h-5 w-5 text-fb-blue" />
                </div>
                <div>
                  <p className="font-semibold text-xs">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
