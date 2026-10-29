import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Globe,
  Sparkles,
  ScrollText,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { useAdminAuth } from '@/context/AdminAuthContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'

export function AdminLayout() {
  const { admin, logout, isDefaultPassword } = useAdminAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await logout()
      toast.success('Signed out of admin session')
      navigate('/admin/login', { replace: true })
    } catch {
      toast.error('Sign out error')
    }
  }

  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/documents', label: 'Documents', icon: FileText },
    { to: '/admin/portfolios', label: 'Live Portfolios', icon: Globe },
    { to: '/admin/ai', label: 'AI Analytics', icon: Sparkles },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col antialiased">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="md:hidden p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center text-[var(--color-primary)] font-bold font-mono">
              <ShieldAlert size={18} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold tracking-tight text-base group-hover:text-[var(--color-primary)] transition-colors">
                Folio<span className="text-[var(--color-primary)]">AI</span>
              </span>
              <span className="text-[11px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Right actions: Back to site, Admin Info, Sign Out */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] transition-all duration-150"
            title="Return to user application"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to site</span>
          </Link>

          <div className="h-4 w-px bg-[var(--color-border)] hidden sm:block" />

          {/* Admin user chip */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs">
            <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-text-inverse)] font-bold flex items-center justify-center text-[10px]">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            <span className="font-medium hidden sm:inline">{admin?.name || 'Admin'}</span>
            <Badge variant="primary" className="hidden md:inline-flex text-[9px]">Admin</Badge>
          </div>

          {/* Sign out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] gap-1.5 px-2.5"
            title="Sign out of admin session"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {/* ── Default Password Warning Banner ─────────────────────── */}
      {isDefaultPassword && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-400">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Security Warning:</strong> The default administrator password (<code>ADMIN</code>) is currently in use.
            </span>
          </div>
          <Link
            to="/admin/settings"
            className="shrink-0 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium rounded border border-amber-500/40 text-xs transition-colors"
          >
            Change Password
          </Link>
        </div>
      )}

      {/* ── Main Container: Sidebar + Page Outlet ──────────────── */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-60 border-r border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 py-4 px-3">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
            Administration
          </div>
          <nav className="flex-1 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Quick info widget at bottom */}
          <div className="mt-auto p-3 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase text-[var(--color-text)]">
              <span>FolioAI Core</span>
              <span className="text-[var(--color-primary)]">v1.2.0</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed">
              Admin console with server-side role enforcement.
            </p>
          </div>
        </aside>

        {/* Mobile Slide-Out Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-64 max-w-[80vw] bg-[var(--color-surface)] border-r border-[var(--color-border)] p-4 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-4">
                <span className="font-bold text-sm">Navigation</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 space-y-1">
                {navItems.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-semibold'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]'
                        }`
                      }
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>

              <div className="pt-4 border-t border-[var(--color-border)] mt-auto">
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="gap-2 text-xs"
                >
                  <LogOut size={14} />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Page Content ───────────────────────────────────────── */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

