import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Zap, Moon, Sun, LogOut, Settings, LayoutDashboard, User, ShieldCheck, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from './Button'

export function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${
      isActive
        ? 'text-[var(--color-primary)] bg-[var(--color-primary-subtle)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-primary-subtle)]'
    }`

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'
  const firstName = user?.name ? user.name.split(' ')[0] : 'Profile'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
      <div className="w-full max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors tracking-tight">
          <Zap size={18} className="text-[var(--color-primary)]" />
          Career Folio
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
          {/* Theme Toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="flex items-center justify-center w-9 h-9 rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] transition-all duration-150"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {user ? (
            /* User Profile Button with Dropdown */
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition-all duration-150 cursor-pointer text-left"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-bold text-xs flex items-center justify-center border border-[var(--color-primary)]/20 shrink-0">
                  {userInitial}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-[var(--color-text)] max-w-[110px] truncate">
                  {firstName}
                </span>
                <ChevronDown size={14} className={`text-[var(--color-text-muted)] transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-2xl p-2 z-50">
                  {/* User details header */}
                  <div className="px-3 py-2.5 border-b border-[var(--color-border)] mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] font-bold text-sm flex items-center justify-center border border-[var(--color-primary)]/30 shrink-0">
                        {userInitial}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text)] truncate">{user.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
                      </div>
                    </div>
                    {user.role === 'admin' && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                        Administrator
                      </span>
                    )}
                  </div>

                  {/* Menu Links */}
                  <div className="flex flex-col gap-0.5 py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] rounded-[var(--radius-control)] transition-colors"
                    >
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] rounded-[var(--radius-control)] transition-colors"
                    >
                      <User size={14} /> Profile &amp; Settings
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] rounded-[var(--radius-control)] transition-colors"
                      >
                        <ShieldCheck size={14} /> Admin Panel
                      </Link>
                    )}
                  </div>

                  {/* Logout item */}
                  <div className="border-t border-[var(--color-border)] pt-1 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-[var(--radius-control)] transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button as={Link} to="/login" size="sm">Get started</Button>
          )}
        </div>
      </div>
    </header>
  )
}
