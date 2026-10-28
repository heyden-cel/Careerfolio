import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'var(--color-primary-subtle)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
        }}
      >
        <Compass size={32} style={{ color: 'var(--color-primary)' }} />
      </div>

      <span
        style={{
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--color-primary)',
          marginBottom: '8px',
        }}
      >
        404 — Page Not Found
      </span>

      <h1
        style={{
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginBottom: '10px',
        }}
      >
        Lost in cyberspace?
      </h1>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-muted)',
          maxWidth: '420px',
          lineHeight: 1.6,
          marginBottom: '28px',
        }}
      >
        The page or resource you are looking for doesn't exist, has been removed, or was unpublished.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            background: 'var(--color-primary)',
            color: 'var(--color-text-inverse)',
            textDecoration: 'none',
            transition: 'background 150ms',
          }}
        >
          <ArrowLeft size={14} /> Go to Dashboard
        </Link>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            textDecoration: 'none',
            transition: 'all 150ms',
          }}
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
