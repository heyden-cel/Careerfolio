import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, FileText, Globe, Search, LayoutDashboard,
  Copy, Trash2, ExternalLink, Edit3, ChevronRight,
  User, Zap, AlertCircle, X, Check,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  getProfile, getDocuments, deleteDocument,
  upsertDocument, generateId, Document, Profile,
  getFlatSkills,
} from '@/lib/storage'
import { toast } from '@/components/ui/Toast'

// ─── helpers ──────────────────────────────────────────────────────────────────
function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 2)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

interface CompletionResult { pct: number; missing: string[] }
function profileCompletion(p: Profile): CompletionResult {
  const checks: [boolean, string][] = [
    [!!p.name,              'Full name'],
    [!!p.email,             'Email address'],
    [!!p.headline,          'Professional title'],
    [!!p.location,          'Location'],
    [!!p.website,           'Website / LinkedIn'],
    [!!p.summary,                      'About / Summary'],
    [getFlatSkills(p.skills).length > 0, 'At least one skill'],
    [p.experience.length > 0,          'At least one experience'],
    [p.projects.length > 0, 'At least one project'],
  ]
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label)
  const pct = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { pct, missing }
}

// ─── styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    background: 'var(--color-bg)', minHeight: '100vh',
    padding: '2.5rem 1.5rem 5rem',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
  },
  wrap: { width: '100%', maxWidth: '1100px' },
  card: (hover = false): React.CSSProperties => ({
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px', padding: '20px',
    transition: 'border-color 150ms',
    cursor: hover ? 'pointer' : 'default',
  }),
  tag: (color: 'green' | 'gray' | 'red'): React.CSSProperties => {
    const map = {
      green: { bg: 'var(--color-primary-subtle)', border: 'rgba(34,197,94,.3)', text: 'var(--color-primary)' },
      gray:  { bg: 'var(--color-border)',         border: 'var(--color-border)', text: 'var(--color-text-muted)' },
      red:   { bg: 'var(--color-danger-subtle)',  border: 'rgba(239,68,68,.3)',  text: 'var(--color-danger)' },
    }[color]
    return {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px',
      fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
      background: map.bg, border: `1px solid ${map.border}`, color: map.text,
    }
  },
  iconBtn: (danger = false): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
    background: 'transparent', cursor: 'pointer', transition: 'background 150ms, color 150ms',
    color: danger ? 'var(--color-danger)' : 'var(--color-text-muted)',
  }),
  input: {
    width: '100%', padding: '9px 12px 9px 36px', fontSize: '14px',
    borderRadius: '8px', border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text)',
    outline: 'none', transition: 'border-color 150ms, box-shadow 150ms',
  } as React.CSSProperties,
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '9px 16px', fontSize: '13px', fontWeight: 600,
    borderRadius: '8px', border: 'none', cursor: 'pointer',
    background: 'var(--color-primary)', color: 'var(--color-text-inverse)',
    transition: 'background 150ms',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '9px 16px', fontSize: '13px', fontWeight: 500,
    borderRadius: '8px', border: '1px solid var(--color-border)',
    background: 'transparent', color: 'var(--color-text-muted)',
    cursor: 'pointer', transition: 'border-color 150ms, color 150ms',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
}

// ─── confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onCancel }: {
  title: string; body: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--color-elevated)', border: '1px solid var(--color-border)',
        borderRadius: '16px', width: '100%', maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)' }}>{title}</p>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '20px 24px 8px' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{body}</p>
        </div>
        <div style={{ padding: '16px 24px 20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={S.btnSecondary}>Cancel</button>
          <button onClick={onConfirm} style={{
            ...S.btnPrimary, background: 'transparent',
            color: 'var(--color-danger)', border: '1px solid var(--color-danger)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-danger)' }}
          >
            <Trash2 size={13} /> Delete permanently
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── doc card ─────────────────────────────────────────────────────────────────
function DocCard({ doc, onOpen, onDuplicate, onDelete }: {
  doc: Document
  onOpen: () => void; onDuplicate: () => void; onDelete: () => void
}) {
  const isResume = doc.type === 'resume'
  return (
    <div style={{
      ...S.card(),
      display: 'flex', flexDirection: 'column', gap: '14px',
      transition: 'border-color 150ms, box-shadow 150ms',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)'
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px var(--color-primary)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)'
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {/* Type badge */}
            <span style={S.tag(isResume ? 'gray' : 'gray')}>
              {isResume ? <FileText size={9} /> : <Globe size={9} />}
              {isResume ? 'Resume' : 'Portfolio'}
            </span>
            {/* Live / Draft */}
            {doc.live
              ? <span style={S.tag('green')}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  Live
                </span>
              : <span style={S.tag('gray')}>Draft</span>
            }
          </div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>{doc.title}</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            Edited {relativeDate(doc.editedAt)}
          </p>
        </div>
        {/* Large type icon */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: 'var(--color-primary-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isResume
            ? <FileText size={18} color="var(--color-primary)" />
            : <Globe    size={18} color="var(--color-primary)" />
          }
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={onOpen}
          style={{ ...S.btnPrimary, padding: '7px 14px', fontSize: '12px', flex: 1, justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
        >
          <Edit3 size={12} /> Open
        </button>
        {doc.live && (
          <a href={`/p/${doc.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button style={{ ...S.iconBtn(), border: '1px solid var(--color-border)' }}
              title="View live"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-subtle)'; e.currentTarget.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
              <ExternalLink size={13} />
            </button>
          </a>
        )}
        <button title="Duplicate" onClick={onDuplicate} style={{ ...S.iconBtn(), border: '1px solid var(--color-border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-subtle)'; e.currentTarget.style.color = 'var(--color-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
          <Copy size={13} />
        </button>
        <button title="Delete" onClick={onDelete} style={{ ...S.iconBtn(true), border: '1px solid var(--color-border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-subtle)'; e.currentTarget.style.borderColor = 'var(--color-danger)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border)' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── empty state ──────────────────────────────────────────────────────────────
function EmptyState({ tab, onCreate }: { tab: string; onCreate: (t: 'resume' | 'portfolio') => void }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', gap: '16px', textAlign: 'center',
      border: '1.5px dashed var(--color-border)', borderRadius: '16px',
    }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {tab === 'portfolio' ? <Globe size={24} color="var(--color-primary)" /> : <FileText size={24} color="var(--color-primary)" />}
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '4px' }}>
          {tab === 'all' ? 'No documents yet' : tab === 'resume' ? 'No resumes yet' : 'No portfolios yet'}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '300px', lineHeight: 1.6 }}>
          Create your first document and start building your professional presence.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
        {tab !== 'portfolio' && (
          <button onClick={() => onCreate('resume')} style={S.btnPrimary}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}>
            <Plus size={14} /> New resume
          </button>
        )}
        {tab !== 'resume' && (
          <button onClick={() => onCreate('portfolio')} style={S.btnSecondary}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
            <Plus size={14} /> New portfolio
          </button>
        )}
      </div>
    </div>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; accent?: boolean
}) {
  return (
    <div style={S.card()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>{label}</span>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color="var(--color-primary)" />
        </div>
      </div>
      <p style={{ fontSize: '28px', fontWeight: 700, color: accent ? 'var(--color-primary)' : 'var(--color-text)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sub}</p>}
    </div>
  )
}

// ─── profile completeness card ────────────────────────────────────────────────
function CompletenessCard({ profile }: { profile: Profile }) {
  const { pct, missing } = profileCompletion(profile)
  const [expanded, setExpanded] = useState(false)
  const color = 'var(--color-primary)'

  return (
    <div style={{ ...S.card(), display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={14} color="var(--color-primary)" />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Profile</span>
        </div>
        <span style={{ fontSize: '24px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{pct}%</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '999px', transition: 'width 600ms ease' }} />
      </div>

      {missing.length > 0 && (
        <>
          <button onClick={() => setExpanded(e => !e)} style={{
            display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '12px', padding: 0,
          }}>
            <AlertCircle size={12} color="var(--color-text-muted)" />
            {missing.length} item{missing.length > 1 ? 's' : ''} missing
            <ChevronRight size={12} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
          </button>
          {expanded && (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '4px' }}>
              {missing.map(m => (
                <li key={m} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} />
                  {m}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {missing.length === 0 && (
        <p style={{ fontSize: '12px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Check size={12} /> Profile complete
        </p>
      )}
    </div>
  )
}

// ─── main dashboard ───────────────────────────────────────────────────────────
type Tab = 'all' | 'resume' | 'portfolio'

export function DashboardPage() {
  const { user }          = useAuth()
  const navigate          = useNavigate()
  const [docs, setDocs]   = useState(() => getDocuments())
  const profile           = useMemo(() => getProfile(), [])
  const [tab, setTab]     = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [delId, setDelId] = useState<string | null>(null)

  const refresh = () => setDocs(getDocuments())

  // ── Create document ──────────────────────────────────────────────────────────
  const createDoc = (type: 'resume' | 'portfolio') => {
    const id   = generateId()
    const slug = `${(profile.name || 'user').toLowerCase().replace(/\s+/g, '-')}-${id}`
    upsertDocument({
      id, type, live: false, slug, editedAt: new Date().toISOString(),
      title: type === 'resume' ? 'Untitled Resume' : 'Untitled Portfolio',
      template: type === 'resume' ? 'classic' : 'midnight',
    })
    refresh()
    toast.success(`${type === 'resume' ? 'Resume' : 'Portfolio'} created`)
    navigate(type === 'resume' ? `/resume/${id}` : `/portfolio/${id}`)
  }

  // ── Duplicate ────────────────────────────────────────────────────────────────
  const duplicate = (doc: Document) => {
    const id = generateId()
    upsertDocument({
      ...doc, id,
      title: `${doc.title} (copy)`,
      live: false,
      slug: `${doc.slug}-copy-${id}`,
      editedAt: new Date().toISOString(),
    })
    refresh()
    toast.success('Document duplicated')
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = () => {
    if (!delId) return
    deleteDocument(delId)
    refresh()
    setDelId(null)
    toast.success('Document deleted')
  }

  // ── Filter & search ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return docs
      .filter(d => tab === 'all' || d.type === tab)
      .filter(d => !query || d.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime())
  }, [docs, tab, query])

  const liveCount  = docs.filter(d => d.live).length
  const tabCounts: Record<Tab, number> = {
    all:       docs.length,
    resume:    docs.filter(d => d.type === 'resume').length,
    portfolio: docs.filter(d => d.type === 'portfolio').length,
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px',
    border: 'none', cursor: 'pointer', transition: 'all 150ms',
    background: tab === t ? 'var(--color-primary-subtle)' : 'transparent',
    color:      tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
    borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
  })

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' as const }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <LayoutDashboard size={16} color="var(--color-primary)" />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--color-text-muted)' }}>Dashboard</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
              {timeGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Here's everything you've built so far.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => createDoc('resume')} style={S.btnSecondary}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
              <Plus size={14} /> New resume
            </button>
            <button onClick={() => createDoc('portfolio')} style={S.btnPrimary}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}>
              <Plus size={14} /> New portfolio
            </button>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
          <CompletenessCard profile={profile} />
          <StatCard icon={FileText} label="Documents" value={docs.length}  sub={`${tabCounts.resume} resume${tabCounts.resume !== 1 ? 's' : ''} · ${tabCounts.portfolio} portfolio${tabCounts.portfolio !== 1 ? 's' : ''}`} />
          <StatCard icon={Zap}      label="Live sites" value={liveCount} accent={liveCount > 0} sub={liveCount > 0 ? 'Publicly accessible' : 'Publish a portfolio to go live'} />
        </div>

        {/* ── Tabs + Search bar ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
          borderBottom: '1px solid var(--color-border)', paddingBottom: '0', flexWrap: 'wrap' as const,
        }}>
          <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
            {(['all', 'resume', 'portfolio'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
                {t === 'all' ? 'All' : t === 'resume' ? <><FileText size={12} /> Resumes</> : <><Globe size={12} /> Portfolios</>}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '18px', height: '18px', borderRadius: '999px', padding: '0 5px',
                  fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                  background: tab === t ? 'var(--color-primary)' : 'var(--color-border)',
                  color: tab === t ? '#000' : 'var(--color-text-muted)',
                  transition: 'all 150ms',
                }}>{tabCounts[t]}</span>
              </button>
            ))}
          </div>
          {/* Search */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search documents…"
              style={S.input}
              onFocus={e  => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-ring)' }}
              onBlur={e   => { e.currentTarget.style.borderColor = 'var(--color-border)';  e.currentTarget.style.boxShadow = 'none' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '2px' }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── Document grid ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.length === 0 && (
            query
              ? (
                <div style={{
                  gridColumn: '1 / -1', textAlign: 'center', padding: '48px',
                  color: 'var(--color-text-muted)', fontSize: '14px',
                }}>
                  <Search size={28} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
                  No documents match "<strong>{query}</strong>"
                </div>
              )
              : <EmptyState tab={tab} onCreate={createDoc} />
          )}
          {filtered.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              onOpen={() => navigate(doc.type === 'resume' ? `/resume/${doc.id}` : `/portfolio/${doc.id}`)}
              onDuplicate={() => duplicate(doc)}
              onDelete={() => setDelId(doc.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Delete modal ──────────────────────────────────────────────────────── */}
      {delId && (
        <ConfirmModal
          title="Delete document"
          body="This will permanently remove this document. You can't undo this action."
          onConfirm={confirmDelete}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}
