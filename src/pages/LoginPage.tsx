import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Zap, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AuthError } from '@/lib/auth'
import { adminApi } from '@/lib/adminApi'
import { toast } from '@/components/ui/Toast'

// ── Validation ────────────────────────────────────────────────────────────────
function validateEmail(v: string) {
  if (!v) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.'
  return ''
}
function validatePassword(v: string) {
  if (!v) return 'Password is required.'
  if (v.length < 8) return 'Password must be at least 8 characters.'
  return ''
}
function validateName(v: string) {
  if (!v.trim()) return 'Full name is required.'
  return ''
}
function validateConfirm(password: string, confirm: string) {
  if (!confirm) return 'Please confirm your password.'
  if (confirm !== password) return 'Passwords do not match.'
  return ''
}

// ── Google SVG ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ── Field with inline error ───────────────────────────────────────────────────
interface FieldProps {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
  children?: React.ReactNode   // slot for suffix (show/hide toggle)
}

function Field({ label, type = 'text', value, onChange, error, placeholder, autoComplete, required, children }: FieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
      <label htmlFor={id} style={{
        fontSize:'13px', fontWeight:500, color:'var(--color-text)'
      }}>
        {label}{required && <span style={{ color:'var(--color-danger)', marginLeft:'2px' }}>*</span>}
      </label>
      <div style={{ position:'relative' }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          style={{
            width:'100%',
            padding: children ? '10px 44px 10px 12px' : '10px 12px',
            fontSize:'14px',
            borderRadius:'var(--radius-control)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            background:'var(--color-surface)',
            color:'var(--color-text)',
            outline:'none',
            transition:'border-color 150ms, box-shadow 150ms',
            boxShadow: error ? '0 0 0 3px var(--color-danger-ring)' : 'none',
          }}
          onFocus={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.boxShadow   = '0 0 0 3px var(--color-primary-ring)'
            }
          }}
          onBlur={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.boxShadow   = 'none'
            }
          }}
        />
        {children && (
          <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)' }}>
            {children}
          </div>
        )}
      </div>
      {error && (
        <span id={`${id}-err`} role="alert" style={{
          fontSize:'12px', color:'var(--color-danger)',
          display:'flex', alignItems:'center', gap:'4px'
        }}>
          {error}
        </span>
      )}
    </div>
  )
}

// ── Show/hide toggle ──────────────────────────────────────────────────────────
function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Hide password' : 'Show password'}
      style={{
        background:'none', border:'none', cursor:'pointer', padding:'2px',
        color:'var(--color-text-muted)', display:'flex', alignItems:'center',
        transition:'color 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type Tab = 'signin' | 'signup'

export function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth()
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const next      = params.get('next') || '/'

  const [tab, setTab]   = useState<Tab>('signin')
  const [busy, setBusy] = useState(false)

  // Sign-in fields
  const [siEmail, setSiEmail]   = useState('')
  const [siPass,  setSiPass]    = useState('')
  const [siShowP, setSiShowP]   = useState(false)
  const [siErrors, setSiErrors] = useState<Record<string,string>>({})

  // Sign-up fields
  const [suName,    setSuName]    = useState('')
  const [suEmail,   setSuEmail]   = useState('')
  const [suPass,    setSuPass]    = useState('')
  const [suConfirm, setSuConfirm] = useState('')
  const [suShowP,   setSuShowP]   = useState(false)
  const [suShowC,   setSuShowC]   = useState(false)
  const [suErrors,  setSuErrors]  = useState<Record<string,string>>({})

  // ── Validate + submit sign-in ──────────────────────
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()

    // If the identifier has no @, treat it as an admin ID login (never email)
    if (siEmail.trim() && !siEmail.includes('@')) {
      if (!siPass) {
        setSiErrors({ email: '', password: 'Password is required.' })
        return
      }
      setBusy(true)
      try {
        await adminApi.login(siEmail.trim(), siPass)
        toast.success('Admin session started.')
        navigate('/admin', { replace: true })
        return
      } catch (err) {
        const status = (err as any)?.response?.status
        const resp   = (err as any)?.response?.data
        if (status === 429 || resp?.locked) {
          setSiErrors({ email: '', password: resp?.error || 'Form locked for 15 minutes after 5 failed attempts.' })
        } else {
          setSiErrors({ email: '', password: 'Invalid ID or password.' })
        }
        setBusy(false)
        return
      }
    }

    // Normal email-based user login
    const errs = {
      email:    validateEmail(siEmail),
      password: validatePassword(siPass),
    }
    setSiErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setBusy(true)
    try {
      await login(siEmail, siPass)
      toast.success('Welcome back!')
      navigate(next, { replace: true })
    } catch (err) {
      const msg = err instanceof AuthError ? err.message : 'Something went wrong. Please try again.'
      setSiErrors(e => ({ ...e, password: msg }))
    } finally { setBusy(false) }
  }

  // ── Validate + submit sign-up ──────────────────────────────────────────────
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault()
    const errs = {
      name:     validateName(suName),
      email:    validateEmail(suEmail),
      password: validatePassword(suPass),
      confirm:  validateConfirm(suPass, suConfirm),
    }
    setSuErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setBusy(true)
    try {
      await register(suName, suEmail, suPass)
      toast.success('Account created!')
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof AuthError ? err.message : 'Something went wrong. Please try again.'
      setSuErrors(e => ({ ...e, email: msg }))
    } finally { setBusy(false) }
  }

  // ── Google sign-in ─────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setBusy(true)
    try {
      await loginWithGoogle()
      toast.success('Signed in with Google!')
      navigate(tab === 'signup' ? '/onboarding' : next, { replace: true })
    } catch {
      toast.error('Google sign-in failed.')
    } finally { setBusy(false) }
  }

  // ── Shared button styles ───────────────────────────────────────────────────
  const btnPrimary: React.CSSProperties = {
    width:'100%', padding:'11px 16px', fontSize:'14px', fontWeight:600,
    borderRadius:'var(--radius-control)', border:'none', cursor: busy ? 'not-allowed' : 'pointer',
    background:'var(--color-primary)', color:'var(--color-text-inverse)',
    opacity: busy ? 0.6 : 1,
    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
    transition:'background 150ms',
  }
  const btnGoogle: React.CSSProperties = {
    width:'100%', padding:'10px 16px', fontSize:'14px', fontWeight:500,
    borderRadius:'var(--radius-control)',
    border:'1px solid var(--color-border)',
    background:'transparent', color:'var(--color-text)', cursor: busy ? 'not-allowed' : 'pointer',
    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
    transition:'border-color 150ms, background 150ms',
    opacity: busy ? 0.6 : 1,
  }
  const divider: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:'12px',
    color:'var(--color-text-muted)', fontSize:'12px',
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'2rem 1rem', background:'var(--color-bg)',
    }}>
      <div style={{ width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', gap:'32px' }}>

        {/* Logo + heading */}
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
          <div style={{
            width:'48px', height:'48px', borderRadius:'var(--radius-card)',
            background:'var(--color-primary-subtle)',
            border:'1px solid rgba(34,197,94,.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Zap size={22} color="var(--color-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:700, color:'var(--color-text)', letterSpacing:'-0.02em' }}>
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ fontSize:'14px', color:'var(--color-text-muted)', marginTop:'4px' }}>
              {tab === 'signin' ? 'Sign in to continue to FolioAI' : 'Start building your portfolio today'}
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'var(--color-surface)',
          border:'1px solid var(--color-border)',
          borderRadius:'var(--radius-card)',
          overflow:'hidden',
        }}>
          {/* Tabs */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr',
            borderBottom:'1px solid var(--color-border)',
          }}>
            {(['signin','signup'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding:'14px 0', fontSize:'14px', fontWeight:500,
                  background:'none', border:'none', cursor:'pointer',
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition:'color 150ms, border-color 150ms',
                  marginBottom:'-1px',
                }}
              >
                {t === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <div style={{ padding:'28px 28px 24px' }}>
            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              style={btnGoogle}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-text-muted)'
                e.currentTarget.style.background  = 'var(--color-elevated)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.background  = 'transparent'
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ ...divider, margin:'20px 0' }}>
              <div style={{ flex:1, height:'1px', background:'var(--color-border)' }} />
              or continue with email
              <div style={{ flex:1, height:'1px', background:'var(--color-border)' }} />
            </div>

            {/* ── Sign In form ── */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} noValidate style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <Field
                  label="Email" type="email" required
                  value={siEmail} onChange={v => { setSiEmail(v); setSiErrors(e => ({ ...e, email:'' })) }}
                  error={siErrors.email}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <Field
                  label="Password" type={siShowP ? 'text' : 'password'} required
                  value={siPass} onChange={v => { setSiPass(v); setSiErrors(e => ({ ...e, password:'' })) }}
                  error={siErrors.password}
                  placeholder="••••••••"
                  autoComplete="current-password"
                >
                  <EyeToggle show={siShowP} onToggle={() => setSiShowP(p => !p)} />
                </Field>

                <button
                  type="submit" disabled={busy}
                  style={btnPrimary}
                  onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
                  onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--color-primary)' }}
                >
                  {busy ? 'Signing in…' : <>Sign in <ArrowRight size={14} /></>}
                </button>
              </form>
            )}

            {/* ── Sign Up form ── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} noValidate style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <Field
                  label="Full name" required
                  value={suName} onChange={v => { setSuName(v); setSuErrors(e => ({ ...e, name:'' })) }}
                  error={suErrors.name}
                  placeholder="Your Name"
                  autoComplete="name"
                />
                <Field
                  label="Email" type="email" required
                  value={suEmail} onChange={v => { setSuEmail(v); setSuErrors(e => ({ ...e, email:'' })) }}
                  error={suErrors.email}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <Field
                  label="Password" type={suShowP ? 'text' : 'password'} required
                  value={suPass} onChange={v => { setSuPass(v); setSuErrors(e => ({ ...e, password:'' })) }}
                  error={suErrors.password}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                >
                  <EyeToggle show={suShowP} onToggle={() => setSuShowP(p => !p)} />
                </Field>
                <Field
                  label="Confirm password" type={suShowC ? 'text' : 'password'} required
                  value={suConfirm} onChange={v => { setSuConfirm(v); setSuErrors(e => ({ ...e, confirm:'' })) }}
                  error={suErrors.confirm}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                >
                  <EyeToggle show={suShowC} onToggle={() => setSuShowC(p => !p)} />
                </Field>

                <button
                  type="submit" disabled={busy}
                  style={btnPrimary}
                  onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
                  onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--color-primary)' }}
                >
                  {busy ? 'Creating account…' : <>Create account <ArrowRight size={14} /></>}
                </button>

                <p style={{ fontSize:'12px', color:'var(--color-text-muted)', textAlign:'center', lineHeight:1.5 }}>
                  By signing up you agree to our{' '}
                  <Link to="#" style={{ color:'var(--color-primary)' }}>Terms</Link> and{' '}
                  <Link to="#" style={{ color:'var(--color-primary)' }}>Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Footer link */}
        <p style={{ textAlign:'center', fontSize:'14px', color:'var(--color-text-muted)' }}>
          {tab === 'signin'
            ? <>No account? <button onClick={() => setTab('signup')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-primary)', fontWeight:500, fontSize:'14px' }}>Sign up free</button></>
            : <>Already have an account? <button onClick={() => setTab('signin')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-primary)', fontWeight:500, fontSize:'14px' }}>Sign in</button></>
          }
        </p>
      </div>
    </div>
  )
}
