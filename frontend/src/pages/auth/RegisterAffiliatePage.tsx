import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/services/api'

export default function RegisterAffiliatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get('/checkout')
      .then(res => {
        const forms = res.data?.data || []
        const defaultForm = forms.find((f: any) => f.formType === 'AFFILIATE' && f.isActive)
        if (defaultForm) {
          const params = new URLSearchParams()
          if (searchParams.get('ref')) params.set('ref', searchParams.get('ref')!)
          const qs = params.toString()
          navigate(`/checkout/${defaultForm.slug}${qs ? `?${qs}` : ''}`, { replace: true })
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Pendaftaran Affiliate Sedang Tidak Tersedia</h1>
          <p className="text-sm text-slate-400 mt-2">Form pendaftaran affiliate belum dikonfigurasi</p>
          <Link to="/login">
            <Button className="mt-4 text-xs">Kembali ke Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
        <p className="text-sm text-slate-400 mt-3">Memuat form pendaftaran affiliate...</p>
      </div>
    </div>
  )
}
