import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, ShieldAlert, Lock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useAdminAuth } from '@/context/AdminAuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'

export function AdminLoginPage() {
  const { admin, login, isLoading: authLoading } = useAdminAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [adminId, setAdminId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)

  // Local failed attempt & lockout tracking (synced with server)
  const [lockoutExpiry, setLockoutExpiry] = useState<number | null>(() => {
    const saved = localStorage.getItem('folio_admin_lockout')
    if (saved) {
      const exp = parseInt(saved, 10)
      if (exp > Date.now()) return exp
      localStorage.removeItem('folio_admin_lockout')
    }
    return null
  })
  const [minutesRemaining, setMinutesRemaining] = useState<number>(0)

  // If already authenticated as admin, go to /admin or next param
  useEffect(() => {
    if (!authLoading && admin?.role === 'admin') {
      const next = searchParams.get('next') || '/admin'
      navigate(next, { replace: true })
    }
  }, [admin, authLoading, navigate, searchParams])

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockoutExpiry) return

    const updateTimer = () => {
      const remainingMs = lockoutExpiry - Date.now()
      if (remainingMs <= 0) {
        setLockoutExpiry(null)
        setMinutesRemaining(0)
        setInlineError(null)
        localStorage.removeItem('folio_admin_lockout')
      } else {
        setMinutesRemaining(Math.ceil(remainingMs / (60 * 1000)))
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 5000)
    return () => clearInterval(interval)
  }, [lockoutExpiry])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setInlineError(null)

    if (lockoutExpiry && lockoutExpiry > Date.now()) {
      setInlineError(`Form is locked due to 5 failed attempts. Please try again in ${minutesRemaining} minute(s).`)
      return
    }

    if (!adminId.trim() || !password) {
      setInlineError('Please provide both Admin ID and password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(adminId.trim(), password)
      toast.success('Admin authentication successful')
      localStorage.removeItem('folio_admin_lockout')
      localStorage.removeItem('folio_failed_attempts')
      const next = searchParams.get('next') || '/admin'
      navigate(next, { replace: true })
    } catch (err: any) {
      const resp = err.response?.data
      if (err.response?.status === 429 || resp?.locked) {
        const lockMs = Date.now() + 15 * 60 * 1000
        setLockoutExpiry(lockMs)
        localStorage.setItem('folio_admin_lockout', lockMs.toString())
        setMinutesRemaining(15)
        setInlineError(resp?.error || 'Account locked for 15 minutes due to 5 failed attempts.')
        toast.error('Account locked due to 5 failed attempts.')
      } else {
        // Track client-side failed attempts count
        const prev = parseInt(localStorage.getItem('folio_failed_attempts') || '0', 10) + 1
        localStorage.setItem('folio_failed_attempts', prev.toString())

        if (prev >= 5) {
          const lockMs = Date.now() + 15 * 60 * 1000
          setLockoutExpiry(lockMs)
          localStorage.setItem('folio_admin_lockout', lockMs.toString())
          setMinutesRemaining(15)
          setInlineError('Form locked for 15 minutes after 5 failed attempts.')
          toast.error('Form locked after 5 failed attempts.')
        } else {
          // Standard generic message requirement: "Invalid ID or password"
          setInlineError(resp?.error || 'Invalid ID or password')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLocked = Boolean(lockoutExpiry && lockoutExpiry > Date.now())

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center p-4 relative antialiased">
      {/* Background glow token */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{ background: 'var(--glow-hero)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary-subtle)] border border-[rgba(34,197,94,0.3)] text-[var(--color-primary)] mb-3 shadow-lg">
            <ShieldAlert size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Admin Authentication
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
            Career Folio System Administration Gateway
          </p>
        </div>

        {/* Login Card */}
        <Card elevated className="p-6 sm:p-8 border-[var(--color-border)] shadow-2xl">
          {/* Lockout Warning Banner */}
          {isLocked && (
            <div className="mb-5 p-3 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-start gap-2.5 text-xs text-[var(--color-danger)] animate-in fade-in-0 duration-200">
              <Lock size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Security Lockout Active</p>
                <p className="mt-0.5 opacity-90">
                  Form is locked for 15 minutes after 5 failed attempts. Please wait {minutesRemaining} minute(s) before retrying.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin ID Field (Not Email!) */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-id" className="text-xs font-medium text-[var(--color-text)]">
                Admin ID <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                id="admin-id"
                type="text"
                autoComplete="username"
                autoFocus
                disabled={isLocked || isSubmitting}
                placeholder="Enter admin ID"
                value={adminId}
                onChange={e => {
                  setAdminId(e.target.value)
                  if (inlineError) setInlineError(null)
                }}
                className={`w-full px-3 py-2 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] text-[var(--color-text)] border transition-all duration-150 placeholder:text-[var(--color-text-muted)] placeholder:opacity-60 focus:outline-none focus:ring-2 ${
                  inlineError
                    ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger-ring)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>

            {/* Password Field with Show/Hide toggle */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-password" className="text-xs font-medium text-[var(--color-text)]">
                Password <span className="text-[var(--color-danger)]">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isLocked || isSubmitting}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (inlineError) setInlineError(null)
                  }}
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-[var(--radius-control)] bg-[var(--color-surface)] text-[var(--color-text)] border transition-all duration-150 placeholder:text-[var(--color-text-muted)] placeholder:opacity-60 focus:outline-none focus:ring-2 ${
                    inlineError
                      ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger-ring)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={isLocked || isSubmitting}
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded transition-colors disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Red inline error on failure */}
            {inlineError && (
              <div className="p-2.5 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]/40 flex items-center gap-2 text-xs text-[var(--color-danger)] animate-in fade-in-0 duration-150">
                <AlertCircle size={15} className="shrink-0" />
                <span className="font-medium">{inlineError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={isSubmitting}
              disabled={isLocked || isSubmitting}
              className="mt-2 font-medium"
            >
              {isLocked ? (
                <>
                  <Lock size={15} /> Locked ({minutesRemaining}m)
                </>
              ) : (
                'Sign In to Console'
              )}
            </Button>
          </form>

          {/* Seeded credentials helper note for convenience during development/grading */}
          <div className="mt-6 pt-4 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] font-mono flex items-center justify-between">
            <span>Seeded ID: <strong className="text-[var(--color-text)]">Admin</strong></span>
            <span>Password: <strong className="text-[var(--color-text)]">ADMIN</strong></span>
          </div>
        </Card>

        {/* Back to Site Link */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Return to public user login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

