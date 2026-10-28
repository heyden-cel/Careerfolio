import { createBrowserRouter, RouterProvider, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
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

import { NotFoundPage }       from '@/pages/NotFoundPage'

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

/* ── Router ───────────────────────────────────────────────── */
const router = createBrowserRouter([
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
