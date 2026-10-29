import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAdminAuth } from '@/context/AdminAuthContext'

export function AdminGuard() {
  const { admin, isLoading } = useAdminAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
        <span className="text-xs font-mono text-[var(--color-text-muted)]">Verifying administrator access...</span>
      </div>
    )
  }

  if (!admin || admin.role !== 'admin') {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <Outlet />
}

