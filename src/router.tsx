import { createBrowserRouter, RouterProvider, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AdminAuthProvider } from '@/context/AdminAuthContext'
import { AdminGuard } from '@/components/admin/AdminGuard'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { Navbar } from '@/components/ui/Navbar'
import { Footer } from '@/components/ui/Footer'
import { Loader2 } from 'lucide-react'

import { LandingPage }         from '@/pages/LandingPage'
import { LoginPage }           from '@/pages/LoginPage'
import { OnboardingPage }      from '@/pages/OnboardingPage'
import { DashboardPage }       from '@/pages/DashboardPage'
import { ResumeEditorPage }    from '@/pages/ResumeEditorPage'
import { PortfolioEditorPage } from '@/pages/PortfolioEditorPage'
import { PublicPortfolioPage } from '@/pages/PublicPortfolioPage'
import { SettingsPage }        from '@/pages/SettingsPage'
import { NotFoundPage }        from '@/pages/NotFoundPage'

// Admin pages
import { AdminLoginPage }     from '@/pages/admin/AdminLoginPage'
import { AdminOverviewPage }  from '@/pages/admin/AdminOverviewPage'
import { AdminUsersPage }     from '@/pages/admin/AdminUsersPage'
import { AdminDocumentsPage } from '@/pages/admin/AdminDocumentsPage'
import { AdminPortfoliosPage } from '@/pages/admin/AdminPortfoliosPage'
import { AdminAiPage }        from '@/pages/admin/AdminAiPage'
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage'
import { AdminSettingsPage }  from '@/pages/admin/AdminSettingsPage'

/* ── Guards ───────────────────────────────────────────────── */
function AuthGuard() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <Loader2 className="animate-spin" style={{ color:'var(--color-primary)' }} size={28} />
    </div>
  )
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  return <Outlet />
}

function GuestGuard() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

/* ── Layouts ──────────────────────────────────────────────── */
function AppLayout() {
  const location = useLocation()
  const isEditor = location.pathname.startsWith('/resume/') || location.pathname.startsWith('/portfolio/')
  return (
    <div style={{ width:'100%', minHeight:'100vh', display:'flex', flexDirection:'column', backgroundColor:'var(--color-bg)' }}>
      <Navbar />
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column' }}>
        <Outlet />
      </main>
      {!isEditor && <Footer />}
    </div>
  )
}

/** Wraps all /admin/* routes in the AdminAuthProvider context */
function AdminRoot() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  )
}

/* ── Router ───────────────────────────────────────────────── */
const router = createBrowserRouter([
  /* ── Admin section (completely separate from user app) ──── */
  {
    path: '/admin',
    element: <AdminRoot />,
    children: [
      // Public admin login page (no guard)
      { path: 'login', element: <AdminLoginPage /> },
      // Protected admin pages
      {
        element: <AdminGuard />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminOverviewPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'documents', element: <AdminDocumentsPage /> },
              { path: 'portfolios', element: <AdminPortfoliosPage /> },
              { path: 'ai', element: <AdminAiPage /> },
              { path: 'audit-logs', element: <AdminAuditLogsPage /> },
              { path: 'settings', element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  /* ── User app ────────────────────────────────────────────── */
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        element: <GuestGuard />,
        children: [{ path: '/login', element: <LoginPage /> }],
      },
      {
        element: <AuthGuard />,
        children: [
          { path: '/onboarding',     element: <OnboardingPage /> },
          { path: '/dashboard',      element: <DashboardPage /> },
          { path: '/resume/:id',     element: <ResumeEditorPage /> },
          { path: '/portfolio/:id',  element: <PortfolioEditorPage /> },
          { path: '/settings',       element: <SettingsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/p/:slug', element: <PublicPortfolioPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
