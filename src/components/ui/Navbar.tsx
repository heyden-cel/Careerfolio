import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Zap, Moon, Sun, LogOut, Settings, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from './Button'

export function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => { await logout(); navigate('/') }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
      isActive
        ? 'text-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-primary-subtle)]'
    }`

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
      <div className="w-full max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors tracking-tight">
          <Zap size={18} className="text-[var(--color-primary)]" />
          FolioAI
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          {user ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard size={14} /> Dashboard
              </NavLink>
              <NavLink to="/settings" className={navLinkClass}>
                <Settings size={14} /> Settings
              </NavLink>
            </>
          ) : (
            <NavLink to="/login" className={navLinkClass}>Sign in</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-all duration-150"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {user ? (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-all duration-150"
            >
              <LogOut size={15} />
            </button>
          ) : (
            <Button as={Link} to="/login" size="sm">Get started</Button>
          )}
        </div>
      </div>
    </header>
  )
}
