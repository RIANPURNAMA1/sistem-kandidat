import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

export default function LandingLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()

  const dashboardPath = user ? {
    SUPER_ADMIN: '/admin', ADMIN: '/admin', FINANCE: '/finance',
    AFFILIATE: '/affiliate', KANDIDAT: '/candidate',
  }[user.role] : '/login'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar - Facebook style */}
      <nav className="sticky top-0 z-50 bg-white border-b border-fb-gray-light shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link to="/">
              <img src="/logo2.png" alt="mendunia.id" className="h-8 w-auto" />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-fb-gray rounded-md transition-colors">Beranda</Link>
              <Link to="/programs" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-fb-gray rounded-md transition-colors">Program</Link>
              <Link to="/affiliate/leaderboard" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-fb-gray rounded-md transition-colors">Leaderboard</Link>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath!)}>Dashboard</Button>
                  <Button variant="ghost" size="sm" onClick={logout}>Keluar</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Masuk</Button>
                  <Button size="sm" onClick={() => navigate('/login')}>Daftar Sekarang</Button>
                </div>
              )}
            </div>

            <button className="md:hidden p-2 hover:bg-fb-gray rounded-md" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-fb-gray-light bg-white px-4 py-3 space-y-1">
            <Link to="/" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-fb-gray" onClick={() => setMenuOpen(false)}>Beranda</Link>
            <Link to="/programs" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-fb-gray" onClick={() => setMenuOpen(false)}>Program</Link>
            <Link to="/affiliate/leaderboard" className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-fb-gray" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
            <div className="pt-2 border-t border-fb-gray-light">
              {isAuthenticated ? (
                <Button className="w-full" variant="secondary" onClick={() => { navigate(dashboardPath!); setMenuOpen(false) }}>Dashboard</Button>
              ) : (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => { navigate('/login'); setMenuOpen(false) }}>Masuk</Button>
                  <Button className="w-full" onClick={() => { navigate('/login'); setMenuOpen(false) }}>Daftar</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer - Facebook-style dark */}
      <footer className="bg-[#1c1e21] text-[#b0b3b8] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4">
              <img src="/logo2.png" alt="mendunia.id" className="h-8 w-auto brightness-0 invert" />
              </div>
              <p className="text-sm text-[#b0b3b8] max-w-sm">
                Platform terpercaya untuk pendaftaran program kerja luar negeri, magang, dan pelatihan kerja bagi putra-putri terbaik Indonesia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[#e4e6eb] mb-3 text-sm">Program</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/programs?category=kerja-jepang" className="hover:text-white transition-colors">Kerja ke Jepang</Link></li>
                <li><Link to="/programs?category=kerja-korea" className="hover:text-white transition-colors">Kerja ke Korea</Link></li>
                <li><Link to="/programs?category=magang-jerman" className="hover:text-white transition-colors">Magang ke Jerman</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#e4e6eb] mb-3 text-sm">Kontak</h4>
              <ul className="space-y-2 text-sm">
                <li>info@mendunia.id</li>
                <li>+62-21-12345678</li>
                <li>Senin – Jumat, 08.00–17.00</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#3a3b3c] mt-8 pt-6 text-center text-xs text-[#b0b3b8]">
            &copy; {new Date().getFullYear()} mendunia.id. Hak cipta dilindungi.
          </div>
        </div>
      </footer>
    </div>
  )
}
