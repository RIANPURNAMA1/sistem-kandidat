import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, BookOpen, CreditCard,
  Settings, Menu, X, LogOut, Bell, ChevronDown,
  TrendingUp, FileText, Award, ShieldCheck, ClipboardList,
  Search, Home, ChevronLeft, ChevronRight, BarChart3,
  CheckCheck, Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { cn, formatDateTime } from '@/lib/utils'
import api from '@/services/api'
import AIChat from '@/components/ai/AIChat'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const navConfig: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Kandidat', path: '/admin/candidates', icon: Users },
    { label: 'Program', path: '/admin/programs', icon: BookOpen },
    { label: 'Pembayaran', path: '/admin/payments', icon: CreditCard },
    { label: 'Affiliate', path: '/admin/affiliates', icon: TrendingUp },
    { label: 'Leaderboard', path: '/admin/leaderboard', icon: Award },
    { label: 'Laporan', path: '/admin/reports', icon: BarChart3 },
    { label: 'Pengaturan', path: '/admin/settings', icon: Settings },
    { label: 'Audit Log', path: '/admin/audit-logs', icon: ShieldCheck },
  ],
  finance: [
    { label: 'Dashboard', path: '/finance', icon: LayoutDashboard },
    { label: 'Pembayaran', path: '/finance/payments', icon: CreditCard },
    { label: 'Komisi', path: '/finance/commissions', icon: Award },
  ],
  candidate: [
    { label: 'Dashboard', path: '/candidate', icon: LayoutDashboard },
    { label: 'Profil Saya', path: '/candidate/profile', icon: Users },
    { label: 'Dokumen', path: '/candidate/documents', icon: FileText },
    { label: 'Pendaftaran', path: '/candidate/applications', icon: ClipboardList },
    { label: 'Pembayaran', path: '/candidate/payments', icon: CreditCard },
  ],
  affiliate: [
    { label: 'Dashboard', path: '/affiliate', icon: LayoutDashboard },
    { label: 'Leaderboard', path: '/affiliate/leaderboard', icon: TrendingUp },
    { label: 'Reward', path: '/affiliate/rewards', icon: Gift },
  ],
}

const roleLabel: Record<string, string> = {
  admin: 'Administrator', finance: 'Finance', candidate: 'Kandidat', affiliate: 'Affiliate',
}

export default function DashboardLayout({ role }: { role: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) setIsCollapsed(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const navItems = navConfig[role] || []

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-payment-count'],
    queryFn: async () => {
      const { data } = await api.get('/payments/pending-count')
      return data.data?.count ?? 0
    },
    refetchInterval: 30000,
    enabled: role === 'admin' || role === 'finance',
  })

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/settings/notifications')
      return data.data
    },
    refetchInterval: 15000,
  })

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/settings/notifications/read')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notifications = notifData?.notifications || []
  const unreadCount = notifData?.unreadCount || 0

  const notifIcons: Record<string, string> = {
    PAYMENT_UPLOADED: '📤',
    PAYMENT_VERIFIED: '✅',
    PAYMENT_REJECTED: '❌',
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-fb-gray overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:relative lg:flex">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'absolute -right-3 top-4 flex items-center justify-center h-6 w-6 rounded-full border z-50 transition-all hover:scale-105',
            'border-fb-gray-light  bg-white text-fb-gray-dark hover:text-fb-blue shadow-sm'
          )}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        <aside className={cn(
          'flex flex-col bg-[#009ce1] flex-shrink-0 transition-all duration-300 relative overflow-y-auto',
          isCollapsed ? 'w-[56px]' : 'w-56'
        )}>

          {/* Logo */}
          <div className={cn(
            'flex items-center h-14 border-b border-white/10 flex-shrink-0',
            isCollapsed ? 'justify-center px-0' : 'px-4 gap-2.5'
          )}>
            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <img src="/logo3.png" alt="mendunia.id" className="h-4 w-auto" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white tracking-tight">mendunia.id</span>
                <span className="text-[9px] text-blue-200/60 font-medium -mt-0.5">Management</span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className={cn(
            'flex-1 space-y-0.5 py-3',
            isCollapsed ? 'px-2' : 'px-2.5'
          )}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const isPayment = item.label === 'Pembayaran'
              const count = isPayment ? (pendingCount as number) : 0
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all relative group',
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-blue-200/70 hover:bg-white/5 hover:text-white',
                    isCollapsed ? 'justify-center px-0 py-2.5' : ''
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full shadow-sm" />
                  )}
                  <div className="relative">
                    <item.icon className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-white' : 'text-blue-300/60 group-hover:text-white'
                    )} />
                    {isPayment && count > 0 && (
                      <span className="absolute -top-1.5 -right-2 h-3.5 min-w-[14px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-0.5 leading-none ring-2 ring-[#009ce1]">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                      <span className="flex items-center gap-1.5">{item.label}</span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#007bc4] text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 border border-white/10">
                      {item.label}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-white/10 py-2 px-2.5 space-y-0.5">
            <Link
              to="/"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-blue-200/70 hover:bg-white/5 hover:text-white transition-all relative group',
                isCollapsed ? 'justify-center px-0 py-2.5' : ''
              )}
            >
              <Home className="h-4 w-4 text-blue-300/60 group-hover:text-white flex-shrink-0" />
              {!isCollapsed && <span>Beranda</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#007bc4] text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 border border-white/10">
                  Beranda
                </div>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-blue-200/70 hover:bg-white/5 hover:text-red-300 transition-all relative group',
                isCollapsed ? 'justify-center px-0 py-2.5' : ''
              )}
            >
              <LogOut className="h-4 w-4 text-blue-300/60 group-hover:text-red-300 flex-shrink-0" />
              {!isCollapsed && <span>Keluar</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#007bc4] text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 border border-white/10">
                  Keluar
                </div>
              )}
            </button>
          </div>

          {/* User info */}
          <div className={cn(
            'border-t border-white/10 py-2.5',
            isCollapsed ? 'px-2' : 'px-3'
          )}>
            <div className={cn(
              'flex items-center relative group',
              isCollapsed ? 'justify-center' : 'gap-2.5'
            )}>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ring-2 ring-white/10">
                {user?.email?.[0].toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-white/90">
                    {user?.candidate?.fullName || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-blue-300/60 mt-0.5">{roleLabel[role]}</p>
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-[#007bc4] text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 border border-white/10">
                  <p className="font-semibold">{user?.candidate?.fullName || user?.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-blue-300/60 mt-0.5">{roleLabel[role]}</p>
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#009ce1] z-10 shadow-2xl">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 h-14 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <img src="/logo3.png" alt="mendunia.id" className="h-4 w-auto" />
                  </div>
                  <span className="font-bold text-sm text-white">mendunia.id</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
                  <X className="h-4 w-4 text-white/70" />
                </button>
              </div>

              <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path
                  const isPayment = item.label === 'Pembayaran'
                  const count = isPayment ? (pendingCount as number) : 0
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative',
                        isActive
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />
                      )}
                      <div className="relative">
                        <item.icon className={cn(
                          'h-4 w-4 flex-shrink-0',
                          isActive ? 'text-white' : 'text-blue-300/60'
                        )} />
                        {isPayment && count > 0 && (
                          <span className="absolute -top-1.5 -right-2 h-3.5 min-w-[14px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-0.5 leading-none ring-2 ring-[#009ce1]">
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </div>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="p-2.5 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-blue-200/70 hover:bg-white/5 hover:text-red-300 transition-all"
                >
                  <LogOut className="h-4 w-4 text-blue-300/60" />
                  Keluar
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar — Meta-style minimal header */}
        <header className="flex items-center gap-3 h-14 bg-white border-b border-fb-gray-light/60  px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-fb-gray-dark hover:bg-fb-gray"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Search — Meta-style */}
          <div className="hidden md:flex items-center gap-2 bg-fb-gray border-0 rounded-lg px-3.5 py-1.5 cursor-text w-56 group/search">
            <Search className="h-3.5 w-3.5 text-fb-gray-dark" />
            <span className="text-xs text-fb-gray-dark">Search...</span>
            <div className="ml-auto hidden lg:flex items-center gap-0.5">
              <kbd className="text-[9px] text-fb-gray-dark/40/40 bg-white px-1 py-0.5 rounded border border-fb-gray-light  leading-none">⌘</kbd>
              <kbd className="text-[9px] text-fb-gray-dark/40/40 bg-white px-1 py-0.5 rounded border border-fb-gray-light  leading-none">K</kbd>
            </div>
          </div>

          {/* Notification */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-fb-gray-dark hover:bg-fb-gray rounded-lg transition-all"
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-fb-gray-light  z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150">
                <div className="flex items-center justify-between px-4 py-3 border-b border-fb-gray-light/60 ">
                  <h3 className="text-sm font-semibold text-fb-blue">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markReadMutation.mutate()}
                      className="text-[11px] text-fb-blue/70 hover:text-fb-blue/70 font-medium flex items-center gap-1 transition-colors"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Tandai dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-fb-gray-dark">Tidak ada notifikasi</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-fb-gray-light/40  last:border-0 hover:bg-fb-gray/50/50 transition-colors ${!n.isRead ? 'bg-fb-blue/5' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-fb-blue-light flex items-center justify-center text-sm flex-shrink-0">
                            {notifIcons[n.type] || '🔔'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs ${!n.isRead ? 'font-semibold' : 'font-medium'} text-fb-blue`}>{n.title}</p>
                            <p className="text-[11px] text-fb-gray-dark mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-fb-gray-dark/60/60 mt-1">{formatDateTime(n.createdAt)}</p>
                          </div>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-fb-blue flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar — Meta-style */}
          <div className="flex items-center gap-2 cursor-pointer group pl-1">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-fb-blue to-fb-blue-dark flex items-center justify-center text-white text-[10px] font-bold shadow-sm ring-1 ring-white/50">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-fb-blue group-hover:text-fb-blue-dark transition-colors leading-tight">
                {user?.candidate?.fullName || user?.email?.split('@')[0] || 'User'}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-fb-gray-dark group-hover:text-fb-blue transition-colors hidden sm:block" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

      </div>

      {role !== 'candidate' && role !== 'affiliate' && <AIChat />}
    </div>
  )
}
