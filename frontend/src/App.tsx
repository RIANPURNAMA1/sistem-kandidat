import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/stores/authStore'

import DashboardLayout from '@/components/layout/DashboardLayout'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import RegisterAffiliatePage from '@/pages/auth/RegisterAffiliatePage'

// Admin pages
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminCandidates from '@/pages/admin/Candidates'
import AdminPrograms from '@/pages/admin/Programs'
import AdminPayments from '@/pages/admin/Payments'
import AdminAffiliates from '@/pages/admin/Affiliates'
import AdminCoupons from '@/pages/admin/Coupons'
import AdminFollowUpCategories from '@/pages/admin/FollowUpCategories'
import AdminFollowUpTemplates from '@/pages/admin/FollowUpTemplates'
import AdminFollowUpSend from '@/pages/admin/FollowUpSend'
import AdminFinancialReport from '@/pages/admin/FinancialReport'
import AdminSettings from '@/pages/admin/Settings'
import AdminAuditLogs from '@/pages/admin/AuditLogs'
import AdminCandidateDetail from '@/pages/admin/CandidateDetail'
import InvoicePage from '@/pages/candidate/Invoice'

// Candidate pages
import CandidateDashboard from '@/pages/candidate/Dashboard'
import CandidateProfile from '@/pages/candidate/Profile'
import CandidateDocuments from '@/pages/candidate/Documents'
import CandidateApplications from '@/pages/candidate/Applications'
import CandidatePayments from '@/pages/candidate/Payments'
import CandidateInvoice from '@/pages/candidate/Invoice'

// Affiliate pages
import AffiliateDashboard from '@/pages/affiliate/Dashboard'
import AffiliateLeaderboard from '@/pages/affiliate/Leaderboard'
// Finance pages
import FinanceDashboard from '@/pages/finance/Dashboard'
import FinancePayments from '@/pages/finance/Payments'
import FinanceCommissions from '@/pages/finance/Commissions'

type Role = User['role']

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated && user) {
    const redirectMap: Record<Role, string> = {
      SUPER_ADMIN: '/admin', ADMIN: '/admin', FINANCE: '/finance',
      AFFILIATE: '/affiliate', KANDIDAT: '/candidate',
    }
    return <Navigate to={redirectMap[user.role]} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true }}>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/affiliate" element={<RegisterAffiliatePage />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="candidates/:id" element={<AdminCandidateDetail />} />
          <Route path="programs" element={<AdminPrograms />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="affiliates" element={<AdminAffiliates />} />
          <Route path="leaderboard" element={<AffiliateLeaderboard />} />
          <Route path="reports" element={<AdminFinancialReport />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="follow-up/categories" element={<AdminFollowUpCategories />} />
          <Route path="follow-up/templates" element={<AdminFollowUpTemplates />} />
          <Route path="follow-up/send" element={<AdminFollowUpSend />} />
          <Route path="candidates/:paymentId/invoice" element={<InvoicePage />} />
          <Route path="payments/:paymentId/invoice" element={<InvoicePage />} />
        </Route>

        {/* Candidate */}
        <Route path="/candidate" element={
          <ProtectedRoute roles={['KANDIDAT']}>
            <DashboardLayout role="candidate" />
          </ProtectedRoute>
        }>
          <Route index element={<CandidateDashboard />} />
          <Route path="profile" element={<CandidateProfile />} />
          <Route path="documents" element={<CandidateDocuments />} />
          <Route path="applications" element={<CandidateApplications />} />
          <Route path="payments" element={<CandidatePayments />} />
          <Route path="payments/:paymentId/invoice" element={<CandidateInvoice />} />
        </Route>

        {/* Finance */}
        <Route path="/finance" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'FINANCE']}>
            <DashboardLayout role="finance" />
          </ProtectedRoute>
        }>
          <Route index element={<FinanceDashboard />} />
          <Route path="payments" element={<FinancePayments />} />
          <Route path="payments/:paymentId/invoice" element={<InvoicePage />} />
          <Route path="commissions" element={<FinanceCommissions />} />
        </Route>

        {/* Affiliate */}
        <Route path="/affiliate" element={
          <ProtectedRoute roles={['AFFILIATE']}>
            <DashboardLayout role="affiliate" />
          </ProtectedRoute>
        }>
          <Route index element={<AffiliateDashboard />} />
          <Route path="leaderboard" element={<AffiliateLeaderboard />} />
        </Route>

        <Route path="/unauthorized" element={
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-destructive">403</h1>
              <p className="mt-3 text-muted-foreground">Anda tidak memiliki akses ke halaman ini</p>
            </div>
          </div>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
