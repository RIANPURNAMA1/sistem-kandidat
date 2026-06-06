import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, BookOpen, CreditCard,
  Settings, Menu, X, LogOut, Bell, ChevronDown,
  TrendingUp, FileText, Award, ShieldCheck, ClipboardList,
  Search, Home, ChevronLeft, ChevronRight, BarChart3,
  CheckCheck, Tag, MessageSquare,
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
    { label: 'Kupon', path: '/admin/coupons', icon: Tag },
    { label: 'Follow-Up', path: '/admin/follow-up/categories', icon: MessageSquare },
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
  ],
}

const roleLabel: Record<string, string> = {
  admin: 'Administrator', finance: 'Finance', candidate: 'Kandidat', affiliate: 'Affiliate',
}

export default function DashboardLayout({ role }: { role: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

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

  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:relative lg:flex">
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-4 flex items-center justify-center h-7 w-7 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 shadow-sm z-50 transition-all hover:scale-105"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>

        <aside className={cn(
          'flex flex-col bg-white border-r border-gray-100 flex-shrink-0 transition-all duration-300 relative overflow-y-auto overflow-x-hidden',
          isCollapsed ? 'w-[52px]' : 'w-52'
        )}>

          {/* Logo */}
          <div className={cn(
            'flex items-center h-12 border-b border-gray-100 flex-shrink-0 transition-all duration-300',
            isCollapsed ? 'justify-center px-0' : 'px-4 gap-2'
          )}>
            <img src="/logo3.png" alt="mendunia.id" className="h-6 w-auto flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-semibold text-sm text-gray-900 truncate">
                mendunia<span className="text-indigo-600">.id</span>
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className={cn(
            'flex-1 space-y-0.5',
            isCollapsed ? 'p-1.5 overflow-visible' : 'p-2 overflow-y-auto overflow-x-hidden'
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
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all relative group',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                    isCollapsed ? 'justify-center px-0' : ''
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-600 rounded-r-full" />
                  )}
                  <div className="relative">
                    <item.icon className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    {isPayment && count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-[14px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-0.5 leading-none">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="flex items-center gap-1.5">{item.label}</span>
                  )}
                  {/* Collapsed tooltip */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom actions */}
          <div className={cn(
            'border-t border-gray-100',
            isCollapsed ? 'p-1.5 overflow-visible' : 'p-2'
          )}>
            <Link
              to="/"
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all relative group',
                isCollapsed ? 'justify-center px-0' : ''
              )}
            >
              <Home className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
              {!isCollapsed && <span>Beranda</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50">
                  Beranda
                </div>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all relative group',
                isCollapsed ? 'justify-center px-0' : ''
              )}
            >
              <LogOut className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-500 flex-shrink-0" />
              {!isCollapsed && <span>Keluar</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50">
                  Keluar
                </div>
              )}
            </button>
          </div>

          {/* User info */}
          <div className={cn(
            'border-t border-gray-100 py-2',
            isCollapsed ? 'px-1.5 overflow-visible' : 'px-2'
          )}>
            <div className={cn(
              'flex items-center relative group',
              isCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'
            )}>
              <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {user?.email?.[0].toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-gray-900">
                    {user?.candidate?.fullName || user?.email}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{roleLabel[role]}</p>
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 pointer-events-none transition-all duration-150 whitespace-nowrap z-50">
                  <p className="font-semibold">{user?.candidate?.fullName || user?.email}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{roleLabel[role]}</p>
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 z-10 shadow-xl">
            <div className="flex flex-col h-full">
              {/* Mobile header */}
              <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <img src="/logo3.png" alt="mendunia.id" className="h-6 w-auto" />
                  <span className="font-semibold text-sm text-gray-900">
                    mendunia<span className="text-indigo-600">.id</span>
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Mobile nav */}
              <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
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
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all relative',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-600 rounded-r-full" />
                      )}
                      <div className="relative">
                        <item.icon className={cn(
                          'h-3.5 w-3.5 flex-shrink-0',
                          isActive ? 'text-indigo-600' : 'text-gray-400'
                        )} />
                        {isPayment && count > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-[14px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-0.5 leading-none">
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </div>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Mobile bottom */}
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5 text-gray-400" />
                  Keluar
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center gap-3 h-12 bg-white border-b border-gray-100 px-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 cursor-text hover:border-gray-200 transition-colors">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Cari...</span>
          </div>

          {/* Notification */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-gray-500 hover:bg-gray-100"
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
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markReadMutation.mutate()}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Tandai dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada notifikasi</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-base mt-0.5">{notifIcons[n.type] || '🔔'}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs ${!n.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>{n.title}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                          </div>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-1.5 cursor-pointer group">
            <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block group-hover:text-gray-600 transition-colors" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

      </div>

      {/* AI Chat Assistant */}
      <AIChat />
    </div>
  )
}