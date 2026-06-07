import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/stores/authStore'

import DashboardLayout from '@/components/layout/DashboardLayout'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import RegisterAffiliatePage from '@/pages/auth/RegisterAffiliatePage'
import CheckoutFormPage from '@/pages/checkout/CheckoutFormPage'

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
import AdminNotifications from '@/pages/admin/Notifications'
import AdminAuditLogs from '@/pages/admin/AuditLogs'
import AdminRewards from '@/pages/admin/Rewards'
import AdminCandidateDetail from '@/pages/admin/CandidateDetail'
import AdminMemberAreas from '@/pages/admin/MemberAreas'
import MemberAreaDetail from '@/pages/admin/MemberAreaDetail'
import MemberAreasBrowse from '@/pages/MemberAreasBrowse'
import InvoicePage from '@/pages/candidate/Invoice'
import AdminLMS from '@/pages/admin/LMS'
import AdminLMSCourseDetail from '@/pages/admin/LMSCourseDetail'
import AdminLMSEnrollments from '@/pages/admin/LMSEnrollments'

// Candidate pages
import CandidateDashboard from '@/pages/candidate/Dashboard'
import CandidateProfile from '@/pages/candidate/Profile'
import CandidateDocuments from '@/pages/candidate/Documents'
import CandidateApplications from '@/pages/candidate/Applications'
import CandidatePayments from '@/pages/candidate/Payments'
import CandidateInvoice from '@/pages/candidate/Invoice'
import CandidateNotifications from '@/pages/candidate/Notifications'
import CandidateLMS from '@/pages/candidate/LMS'
import CandidateCourseLearn from '@/pages/candidate/CourseLearn'

// Affiliate pages
import AffiliateDashboard from '@/pages/affiliate/Dashboard'
import AffiliateLeaderboard from '@/pages/affiliate/Leaderboard'
import AffiliateRewards from '@/pages/affiliate/Rewards'
import AffiliateNotifications from '@/pages/affiliate/Notifications'
// Finance pages
import FinanceDashboard from '@/pages/finance/Dashboard'
import FinancePayments from '@/pages/finance/Payments'
import FinanceCommissions from '@/pages/finance/Commissions'
import FinanceNotifications from '@/pages/finance/Notifications'
// Guru pages
import GuruDashboard from '@/pages/guru/Dashboard'
import GuruCourses from '@/pages/guru/Courses'
import GuruCourseManage from '@/pages/guru/CourseManage'

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
      AFFILIATE: '/affiliate', KANDIDAT: '/candidate', GURU: '/guru',
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
        <Route path="/checkout/:slug" element={<CheckoutFormPage />} />

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
          <Route path="rewards" element={<AdminRewards />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="follow-up/categories" element={<AdminFollowUpCategories />} />
          <Route path="follow-up/templates" element={<AdminFollowUpTemplates />} />
          <Route path="follow-up/send" element={<AdminFollowUpSend />} />
          <Route path="member-areas" element={<AdminMemberAreas />} />
          <Route path="member-areas/:slug" element={<MemberAreaDetail />} />
          <Route path="candidates/:paymentId/invoice" element={<InvoicePage />} />
          <Route path="payments/:paymentId/invoice" element={<InvoicePage />} />
          <Route path="lms" element={<AdminLMS />} />
          <Route path="lms/:id" element={<AdminLMSCourseDetail />} />
          <Route path="lms-enrollments" element={<AdminLMSEnrollments />} />
          <Route path="notifications" element={<AdminNotifications />} />
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
          <Route path="notifications" element={<CandidateNotifications />} />
          <Route path="member-areas" element={<MemberAreasBrowse role="candidate" />} />
          <Route path="member-areas/:slug" element={<MemberAreaDetail />} />
          <Route path="lms" element={<CandidateLMS />} />
          <Route path="lms/:courseId" element={<CandidateCourseLearn />} />
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
          <Route path="notifications" element={<FinanceNotifications />} />
        </Route>

        {/* Affiliate */}
        <Route path="/affiliate" element={
          <ProtectedRoute roles={['AFFILIATE']}>
            <DashboardLayout role="affiliate" />
          </ProtectedRoute>
        }>
          <Route index element={<AffiliateDashboard />} />
          <Route path="leaderboard" element={<AffiliateLeaderboard />} />
          <Route path="rewards" element={<AffiliateRewards />} />
          <Route path="notifications" element={<AffiliateNotifications />} />
          <Route path="member-areas" element={<MemberAreasBrowse role="affiliate" />} />
          <Route path="member-areas/:slug" element={<MemberAreaDetail />} />
        </Route>

        {/* Guru */}
        <Route path="/guru" element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'GURU']}>
            <DashboardLayout role="guru" />
          </ProtectedRoute>
        }>
          <Route index element={<GuruDashboard />} />
          <Route path="courses" element={<GuruCourses />} />
          <Route path="courses/:id/manage" element={<GuruCourseManage />} />
          <Route path="notifications" element={<AdminNotifications />} />
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
