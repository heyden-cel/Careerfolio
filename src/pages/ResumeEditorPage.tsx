import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  ChevronDown, ChevronUp, Plus, Trash2,
  Sparkles, Undo2, Check, Download, ArrowLeft,
  FileText, Loader2, Eye, Edit3, ZoomIn, ZoomOut,
  RotateCcw, Globe, Mail, Phone, MapPin,
  Briefcase, FolderGit2, CheckCircle2, Cloud
} from 'lucide-react'
import {
  getProfile, setProfile as saveProfile, getDocuments,
  upsertDocument, generateId, Profile, Experience, Project, Document as DocType,
  getFlatSkills, normalizeSkills
} from '@/lib/storage'
import { AppearanceCard } from '@/components/AppearanceCard'
import { resolvePalette } from '@/lib/palettes'
import { toast } from '@/components/ui/Toast'

// ─── Debounce helper ─────────────────────────────────────────────────────────
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  badge,
  defaultOpen = true,
  children
}: {
  title: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'var(--color-surface)',
      transition: 'border-color 150ms'
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'var(--color-elevated)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text)',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'background 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-subtle)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-elevated)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && <Icon size={15} className="text-[var(--color-primary)]" />}
          <span>{title}</span>
          {badge !== undefined && (
            <span style={{
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '999px',
              background: 'var(--color-border)',
              color: 'var(--color-text-muted)',
              fontWeight: 500,
            }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ color: 'var(--color-text-muted)' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {open && (
        <div style={{
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          borderTop: '1px solid var(--color-border)',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Input Field Component ───────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  colSpan = false,
  icon: Icon
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  colSpan?: boolean
  icon?: React.ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      ...(colSpan ? { gridColumn: '1 / -1' } : {})
    }}>
      <label style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {Icon && <Icon size={12} className="text-[var(--color-text-muted)]" />}
        {label}
        {required && <span style={{ color: 'var(--color-primary)' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '9px 12px',
          fontSize: '13px',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          background: 'var(--color-elevated)',
          color: 'var(--color-text)',
          outline: 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--color-primary)'
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-ring)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

// ─── AI Button & Undo Component ──────────────────────────────────────────────
function AiActionHeader({
  label,
  loading,
  canUndo,
  onGenerate,
  onUndo,
}: {
  label?: string
  loading: boolean
  canUndo: boolean
  onGenerate: () => void
  onUndo: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
      {label ? (
        <label style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em'
        }}>
          {label}
        </label>
      ) : <span />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {canUndo && (
          <button
            type="button"
            onClick={onUndo}
            title="Revert to previous text"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-elevated)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-text-muted)'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-muted)'
            }}
          >
            <Undo2 size={11} /> Undo
          </button>
        )}
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            background: 'var(--color-primary-subtle)',
            color: 'var(--color-primary)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1,
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.22)'
              e.currentTarget.style.borderColor = 'var(--color-primary)'
            }
          }}
          onMouseLeave={e => {
            if (!loading) {
              e.currentTarget.style.background = 'var(--color-primary-subtle)'
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)'
            }
          }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {loading ? 'AI generating…' : '✨ AI'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Classic Template (Single Column, Black Text with Green Accent Only)
// ─────────────────────────────────────────────────────────────────────────────
export function ClassicTemplate({ p, accent = '#16a34a' }: { p: Profile; accent?: string }) {
  const green = accent
  const black = '#0a0a0a'
  const muted = '#4b5563'
  const border = '#e5e7eb'

  return (
    <div
      className="resume-page-classic"
      style={{
        background: '#ffffff',
        color: black,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        padding: '44px 50px',
        minHeight: '297mm',
        width: '100%',
        boxSizing: 'border-box',
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <header
        className="resume-header resume-item"
        style={{
          borderBottom: `2.5px solid ${green}`,
          paddingBottom: '14px',
          marginBottom: '20px',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            margin: 0,
            color: black,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
          }}
        >
          {p.name || 'Your Name'}
        </h1>

        {p.headline && (
          <p
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: green,
              margin: '5px 0 10px',
              letterSpacing: '0.01em',
            }}
          >
            {p.headline}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '14px',
            fontSize: '11px',
            color: muted,
          }}
        >
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>📞 {p.phone}</span>}
          {p.location && <span>📍 {p.location}</span>}
          {p.website && (
            <a
              href={p.website}
              style={{
                color: green,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              🔗 {p.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </header>

      {/* Summary */}
      {p.summary && (
        <section className="resume-section resume-item" style={{ marginBottom: '18px' }}>
          <h2
            className="resume-heading"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: green,
              borderBottom: `1.5px solid ${green}`,
              paddingBottom: '4px',
              marginBottom: '8px',
            }}
          >
            Professional Summary
          </h2>
          <p
            style={{
              fontSize: '11.5px',
              lineHeight: 1.65,
              color: black,
              margin: 0,
            }}
          >
            {p.summary}
          </p>
        </section>
      )}

      {/* Experience */}
      {p.experience && p.experience.length > 0 && (
        <section className="resume-section" style={{ marginBottom: '18px' }}>
          <h2
            className="resume-heading"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: green,
              borderBottom: `1.5px solid ${green}`,
              paddingBottom: '4px',
              marginBottom: '10px',
            }}
          >
            Work Experience
          </h2>
          {p.experience.map(e => (
            <div
              key={e.id}
              className="resume-entry resume-item"
              style={{ marginBottom: '14px' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '3px',
                }}
              >
                <div>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: black }}>
                    {e.role || 'Role'}
                  </span>
                  {e.company && (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: green, marginLeft: '6px' }}>
                      | {e.company}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '10.5px', color: muted, fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                  {e.start}{e.start && (e.end || e.current) ? ' – ' : ''}{e.current ? 'Present' : e.end}
                </span>
              </div>
              {e.description && (
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {e.description.split('\n').filter(b => b.trim()).map((b, i) => (
                    <li
                      key={i}
                      className="resume-bullet resume-item"
                      style={{
                        fontSize: '11px',
                        lineHeight: 1.55,
                        color: black,
                        marginBottom: '3px',
                      }}
                    >
                      {b.replace(/^[•\-\*]\s*/, '')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {getFlatSkills(p.skills).length > 0 && (
        <section className="resume-section resume-item" style={{ marginBottom: '18px' }}>
          <h2
            className="resume-heading"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: green,
              borderBottom: `1.5px solid ${green}`,
              paddingBottom: '4px',
              marginBottom: '8px',
            }}
          >
            Skills & Proficiencies
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {getFlatSkills(p.skills).map((skill, i) => (
              <span
                key={i}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: '#f4fbf6',
                  color: black,
                  border: `1px solid ${green}40`,
                  fontWeight: 500,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {p.projects && p.projects.length > 0 && (
        <section className="resume-section">
          <h2
            className="resume-heading"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: green,
              borderBottom: `1.5px solid ${green}`,
              paddingBottom: '4px',
              marginBottom: '10px',
            }}
          >
            Key Projects
          </h2>
          {p.projects.map(pr => (
            <div
              key={pr.id}
              className="resume-entry resume-item"
              style={{ marginBottom: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: black }}>
                  {pr.title || 'Project Name'}
                </span>
                {pr.url && (
                  <a
                    href={pr.url}
                    style={{
                      fontSize: '11px',
                      color: green,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    🔗 {pr.url.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
              {pr.description && (
                <p style={{ fontSize: '11px', color: black, margin: '2px 0 0', lineHeight: 1.55 }}>
                  {pr.description}
                </p>
              )}
              {pr.tags && pr.tags.length > 0 && (
                <p style={{ fontSize: '10px', color: green, margin: '3px 0 0', fontWeight: 600 }}>
                  Tech: {pr.tags.join(', ')}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Modern Template (Black Sidebar with Name, Contact, Skills; White Main Column)
// ─────────────────────────────────────────────────────────────────────────────
export function ModernTemplate({
  p,
  accent = '#22c55e',
  sidebarBg = '#09090b',
  sidebarText = '#f8fafc',
}: {
  p: Profile
  accent?: string
  sidebarBg?: string
  sidebarText?: string
}) {
  const green = accent
  const black = sidebarBg
  const mainText = '#0a0a0a'
  const mutedText = '#4b5563'

  const initials = (p.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="resume-page-modern"
      style={{
        display: 'flex',
        minHeight: '297mm',
        width: '100%',
        boxSizing: 'border-box',
        background: '#ffffff',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── Black Sidebar (Name, Contact, Skills) ── */}
      <aside
        className="resume-sidebar"
        style={{
          width: '34%',
          background: black,
          color: '#f8fafc',
          padding: '38px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Name & Avatar Header */}
        <div className="resume-item">
          {initials && (
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#18181b',
                border: `2px solid ${green}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                color: green,
                marginBottom: '14px',
              }}
            >
              {initials}
            </div>
          )}
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {p.name || 'Your Name'}
          </h1>
          {p.headline && (
            <p
              style={{
                fontSize: '11px',
                color: green,
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {p.headline}
            </p>
          )}
        </div>

        {/* Contact Information */}
        {(p.email || p.phone || p.location || p.website) && (
          <div className="resume-item">
            <p
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: green,
                margin: '0 0 10px',
                borderBottom: '1px solid #27272a',
                paddingBottom: '4px',
              }}
            >
              Contact
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '10.5px',
                color: '#e4e4e7',
                wordBreak: 'break-word',
              }}
            >
              {p.email && <div>✉ {p.email}</div>}
              {p.phone && <div>📞 {p.phone}</div>}
              {p.location && <div>📍 {p.location}</div>}
              {p.website && (
                <div style={{ color: green }}>
                  🔗 {p.website.replace(/^https?:\/\//, '')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills List in Sidebar */}
        {getFlatSkills(p.skills).length > 0 && (
          <div className="resume-item">
            <p
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: green,
                margin: '0 0 10px',
                borderBottom: '1px solid #27272a',
                paddingBottom: '4px',
              }}
            >
              Skills
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {getFlatSkills(p.skills).map((skill, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '9.5px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: '#18181b',
                    color: '#f4f4f5',
                    border: `1px solid ${green}60`,
                    fontWeight: 500,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── White Main Column (Summary, Experience, Projects) ── */}
      <main
        className="resume-main-column"
        style={{
          flex: 1,
          background: '#ffffff',
          color: mainText,
          padding: '38px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box',
        }}
      >
        {/* Summary */}
        {p.summary && (
          <section className="resume-section resume-item">
            <h2
              className="resume-heading"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: green,
                borderBottom: `2px solid ${green}`,
                paddingBottom: '4px',
                margin: '0 0 8px',
              }}
            >
              Summary
            </h2>
            <p
              style={{
                fontSize: '11.5px',
                lineHeight: 1.65,
                color: mainText,
                margin: 0,
              }}
            >
              {p.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {p.experience && p.experience.length > 0 && (
          <section className="resume-section">
            <h2
              className="resume-heading"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: green,
                borderBottom: `2px solid ${green}`,
                paddingBottom: '4px',
                margin: '0 0 10px',
              }}
            >
              Experience
            </h2>
            {p.experience.map(e => (
              <div
                key={e.id}
                className="resume-entry resume-item"
                style={{ marginBottom: '13px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '2px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: mainText }}>
                      {e.role || 'Role'}
                    </span>
                    {e.company && (
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: green, marginLeft: '6px' }}>
                        @ {e.company}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', color: mutedText, whiteSpace: 'nowrap' }}>
                    {e.start}{e.start && (e.end || e.current) ? ' – ' : ''}{e.current ? 'Present' : e.end}
                  </span>
                </div>
                {e.description && (
                  <ul style={{ margin: '4px 0 0 14px', padding: 0 }}>
                    {e.description.split('\n').filter(b => b.trim()).map((b, i) => (
                      <li
                        key={i}
                        className="resume-bullet resume-item"
                        style={{
                          fontSize: '10.5px',
                          color: mainText,
                          lineHeight: 1.6,
                          marginBottom: '2.5px',
                        }}
                      >
                        {b.replace(/^[•\-\*]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Projects */}
        {p.projects && p.projects.length > 0 && (
          <section className="resume-section">
            <h2
              className="resume-heading"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: green,
                borderBottom: `2px solid ${green}`,
                paddingBottom: '4px',
                margin: '0 0 10px',
              }}
            >
              Projects
            </h2>
            {p.projects.map(pr => (
              <div
                key={pr.id}
                className="resume-entry resume-item"
                style={{ marginBottom: '11px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: mainText }}>
                    {pr.title || 'Project'}
                  </span>
                  {pr.url && (
                    <a
                      href={pr.url}
                      style={{
                        fontSize: '10.5px',
                        color: green,
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      🔗 {pr.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                {pr.description && (
                  <p style={{ fontSize: '10.5px', color: mainText, margin: '2px 0 0', lineHeight: 1.55 }}>
                    {pr.description}
                  </p>
                )}
                {pr.tags && pr.tags.length > 0 && (
                  <p style={{ fontSize: '9.5px', color: green, margin: '2px 0 0', fontWeight: 600 }}>
                    Tech: {pr.tags.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ResumeEditorPage Component
// ─────────────────────────────────────────────────────────────────────────────
export function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Initialize doc
  const [doc] = useState<DocType>(() => {
    const existing = getDocuments().find(d => d.id === id)
    if (existing) return existing
    const newDoc: DocType = {
      id: id || generateId(),
      type: 'resume',
      title: 'Untitled Resume',
      template: 'classic',
      live: false,
      slug: `resume-${id || 'new'}`,
      editedAt: new Date().toISOString(),
    }
    upsertDocument(newDoc)
    return newDoc
  })

  // State
  const [profile, setProfileState] = useState<Profile>(() => getProfile())
  const [title, setTitle] = useState(doc.title || 'Untitled Resume')
  const [template, setTemplate] = useState<'classic' | 'modern'>(
    doc.template === 'modern' ? 'modern' : 'classic'
  )
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
  const [zoom, setZoom] = useState<number>(0.74)
  const [newSkillInput, setNewSkillInput] = useState('')

  // Palette State & Custom Accents
  const [paletteId, setPaletteId] = useState<string>(doc.palette || 'midnight-green')
  const [customAccent, setCustomAccent] = useState<string | undefined>(doc.accent)
  const [customAccent2, setCustomAccent2] = useState<string | undefined>(doc.accent2)

  const resumeTheme = useMemo(
    () => resolvePalette(paletteId, customAccent, customAccent2),
    [paletteId, customAccent, customAccent2]
  )

  // AI loading and undo states (keyed by field)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [undoMap, setUndoMap] = useState<Record<string, string>>({})

  // Debounced Autosave
  const debouncedSave = useCallback(
    debounce((p: Profile, currentTitle: string, currentTemplate: string, currentPal: string, acc?: string, acc2?: string) => {
      setAutosaveStatus('saving')
      saveProfile(p)
      upsertDocument({
        ...doc,
        title: currentTitle,
        template: currentTemplate,
        palette: currentPal,
        accent: acc,
        accent2: acc2,
        editedAt: new Date().toISOString(),
      })
      setTimeout(() => setAutosaveStatus('saved'), 350)
      setTimeout(() => setAutosaveStatus('idle'), 2500)
    }, 1200),
    [doc]
  )

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfileState(prev => {
        const next = { ...prev, ...patch }
        debouncedSave(next, title, template, paletteId, customAccent, customAccent2)
        return next
      })
    },
    [title, template, paletteId, customAccent, customAccent2, debouncedSave]
  )

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    debouncedSave(profile, newTitle, template, paletteId, customAccent, customAccent2)
  }

  const handleTemplateChange = (newTmpl: 'classic' | 'modern') => {
    setTemplate(newTmpl)
    debouncedSave(profile, title, newTmpl, paletteId, customAccent, customAccent2)
  }

  const handlePaletteChange = (newPal: string, newAcc?: string, newAcc2?: string) => {
    setPaletteId(newPal)
    setCustomAccent(newAcc)
    setCustomAccent2(newAcc2)
    debouncedSave(profile, title, template, newPal, newAcc, newAcc2)
  }

  // AI Action Handler
  const handleAI = async (
    key: string,
    type: 'summary' | 'bullets' | 'project',
    currentValue: string,
    apply: (newVal: string) => void
  ) => {
    setLoadingKey(key)
    try {
      let res
      try {
        res = await axios.post('/api/ai', { type })
      } catch {
        res = await axios.post('/api/ai/generate', { type })
      }

      if (res.data?.result) {
        setUndoMap(prev => ({ ...prev, [key]: currentValue }))
        apply(res.data.result)
        toast.success('✨ AI suggestions generated!')
      } else {
        toast.error('AI response was empty')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate AI content.')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleUndo = (key: string, apply: (oldVal: string) => void) => {
    const previous = undoMap[key]
    if (previous !== undefined) {
      apply(previous)
      setUndoMap(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      toast.success('Restored previous text')
    }
  }

  // Skills handlers
  const flatSkills = getFlatSkills(profile.skills)

  const addSkill = (val: string) => {
    const clean = val.trim()
    if (!clean) return
    if (!flatSkills.includes(clean)) {
      if (Array.isArray(profile.skills)) {
        updateProfile({ skills: [...profile.skills, clean] })
      } else {
        const cat = normalizeSkills(profile.skills)
        updateProfile({
          skills: {
            ...cat,
            technical: [...cat.technical, { name: clean }],
          },
        })
      }
    }
    setNewSkillInput('')
  }

  const removeSkill = (index: number) => {
    const target = flatSkills[index]
    if (!target) return
    if (Array.isArray(profile.skills)) {
      updateProfile({ skills: profile.skills.filter((_, i) => i !== index) })
    } else {
      const cat = normalizeSkills(profile.skills)
      updateProfile({
        skills: {
          technical: cat.technical.filter(s => s.name !== target),
          frameworks: cat.frameworks.filter(s => s.name !== target),
          tools: cat.tools.filter(s => s.name !== target),
          soft: cat.soft.filter(s => s.name !== target),
        },
      })
    }
  }

  // Experience handlers
  const addExperience = () => {
    const newExp: Experience = {
      id: generateId(),
      company: '',
      role: '',
      start: '',
      end: '',
      current: false,
      description: '',
    }
    updateProfile({ experience: [...profile.experience, newExp] })
  }

  const removeExperience = (idToRemove: string) => {
    updateProfile({ experience: profile.experience.filter(e => e.id !== idToRemove) })
  }

  const updateExperience = (idToUpdate: string, patch: Partial<Experience>) => {
    updateProfile({
      experience: profile.experience.map(e => (e.id === idToUpdate ? { ...e, ...patch } : e)),
    })
  }

  // Projects handlers
  const addProject = () => {
    const newProj: Project = {
      id: generateId(),
      title: '',
      url: '',
      description: '',
      tags: [],
    }
    updateProfile({ projects: [...profile.projects, newProj] })
  }

  const removeProject = (idToRemove: string) => {
    updateProfile({ projects: profile.projects.filter(p => p.id !== idToRemove) })
  }

  const updateProject = (idToUpdate: string, patch: Partial<Project>) => {
    updateProfile({
      projects: profile.projects.map(p => (p.id === idToUpdate ? { ...p, ...patch } : p)),
    })
  }

  // PDF Download Handler
  const handleDownloadPDF = () => {
    window.print()
  }

  // Done Handler
  const handleDone = () => {
    saveProfile(profile)
    upsertDocument({
      ...doc,
      title,
      template,
      palette: paletteId,
      accent: customAccent,
      accent2: customAccent2,
      editedAt: new Date().toISOString(),
    })
    toast.success('Resume saved successfully!')
    navigate('/dashboard')
  }

  // Quick skill suggestions
  const suggestedSkills = [
    'React', 'TypeScript', 'Node.js', 'Next.js', 'Python',
    'Tailwind CSS', 'PostgreSQL', 'Docker', 'AWS', 'GraphQL', 'REST APIs', 'Git'
  ].filter(s => !flatSkills.includes(s))

  // ─────────────────────────────────────────────────────────────────────────────
  // Left Pane: Editor Form
  // ─────────────────────────────────────────────────────────────────────────────
  const LeftPane = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      padding: '20px 22px 60px',
      maxWidth: '680px',
      margin: '0 auto',
      width: '100%',
    }}>
      {/* ── Appearance Card (Top of Left Pane) ── */}
      <AppearanceCard
        paletteId={paletteId}
        customAccent={customAccent}
        customAccent2={customAccent2}
        jobTitle={profile.headline}
        onChange={handlePaletteChange}
      />

      {/* Editable Title Card */}
      <div style={{
        padding: '16px 18px',
        borderRadius: '12px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <label style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}>
          <Edit3 size={12} className="text-[var(--color-primary)]" /> Resume Title
        </label>
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled Resume"
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-text)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            borderBottom: '2px solid transparent',
            padding: '2px 0 4px',
            transition: 'border-color 150ms',
          }}
          onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--color-primary)')}
          onBlur={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
        />
      </div>

      {/* 1. Basics Section */}
      <Section title="Basics" icon={FileText} defaultOpen={true}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <Field
            label="Full Name"
            required
            value={profile.name}
            onChange={v => updateProfile({ name: v })}
            placeholder="e.g. Alex Morgan"
          />
          <Field
            label="Professional Title"
            value={profile.headline}
            onChange={v => updateProfile({ headline: v })}
            placeholder="e.g. Senior Software Engineer"
          />
          <Field
            label="Email Address"
            type="email"
            icon={Mail}
            value={profile.email}
            onChange={v => updateProfile({ email: v })}
            placeholder="alex@example.com"
          />
          <Field
            label="Phone"
            type="tel"
            icon={Phone}
            value={profile.phone || ''}
            onChange={v => updateProfile({ phone: v })}
            placeholder="+1 (555) 000-0000"
          />
          <Field
            label="Location"
            icon={MapPin}
            value={profile.location}
            onChange={v => updateProfile({ location: v })}
            placeholder="San Francisco, CA"
          />
          <Field
            label="Portfolio / Website / LinkedIn"
            type="url"
            icon={Globe}
            value={profile.website}
            onChange={v => updateProfile({ website: v })}
            placeholder="https://alexmorgan.dev"
          />
        </div>
      </Section>

      {/* 2. Summary Section */}
      <Section title="Summary" icon={Sparkles} defaultOpen={true}>
        <div>
          <AiActionHeader
            label="Professional Summary"
            loading={loadingKey === 'summary'}
            canUndo={Boolean(undoMap['summary'])}
            onGenerate={() =>
              handleAI('summary', 'summary', profile.summary, val => updateProfile({ summary: val }))
            }
            onUndo={() => handleUndo('summary', oldVal => updateProfile({ summary: oldVal }))}
          />
          <textarea
            value={profile.summary}
            onChange={e => updateProfile({ summary: e.target.value })}
            placeholder="Write a concise, compelling summary of your expertise and achievements..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-elevated)',
              color: 'var(--color-text)',
              outline: 'none',
              lineHeight: 1.6,
              resize: 'vertical',
              fontFamily: 'var(--font-ui)',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-ring)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </Section>

      {/* 3. Skills Section */}
      <Section title="Skills" icon={CheckCircle2} badge={flatSkills.length} defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Technical & Soft Skills (Press Enter or Comma to add)
          </label>

          {/* Active Skills Chips */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '7px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-elevated)',
            minHeight: '46px',
            alignItems: 'center',
          }}>
            {flatSkills.map((s, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  fontWeight: 500,
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(idx)}
                  title={`Remove ${s}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    padding: 0,
                    fontSize: '14px',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.8,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={newSkillInput}
              onChange={e => setNewSkillInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addSkill(newSkillInput)
                } else if (e.key === 'Backspace' && !newSkillInput && flatSkills.length > 0) {
                  removeSkill(flatSkills.length - 1)
                }
              }}
              placeholder={flatSkills.length === 0 ? 'e.g. React, TypeScript, Docker…' : 'Add another skill…'}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '13px',
                color: 'var(--color-text)',
                minWidth: '140px',
                flex: 1,
              }}
            />
          </div>

          {/* Quick Suggestions */}
          {suggestedSkills.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Suggestions:</span>
              {suggestedSkills.slice(0, 6).map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => addSkill(skill)}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                    e.currentTarget.style.color = 'var(--color-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                  }}
                >
                  + {skill}
                </button>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* 4. Experience Section */}
      <Section title="Experience" icon={Briefcase} badge={profile.experience.length} defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {profile.experience.map((exp, idx) => {
            const expKey = `exp-${exp.id}`
            return (
              <div
                key={exp.id}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header with Title & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {exp.role || exp.company ? `${exp.role || 'Role'} ${exp.company ? `@ ${exp.company}` : ''}` : `Position #${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExperience(exp.id)}
                    title="Remove experience"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'transparent',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-text-muted)'
                      e.currentTarget.style.color = 'var(--color-text)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                    }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <Field
                    label="Role / Job Title"
                    value={exp.role}
                    onChange={v => updateExperience(exp.id, { role: v })}
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                  <Field
                    label="Company Name"
                    value={exp.company}
                    onChange={v => updateExperience(exp.id, { company: v })}
                    placeholder="e.g. Stripe, Acme Inc"
                  />
                  <Field
                    label="Start Date"
                    value={exp.start}
                    onChange={v => updateExperience(exp.id, { start: v })}
                    placeholder="e.g. Jan 2022"
                  />
                  <Field
                    label="End Date"
                    value={exp.end}
                    onChange={v => updateExperience(exp.id, { end: v })}
                    placeholder={exp.current ? 'Present' : 'e.g. Oct 2024'}
                  />
                </div>

                {/* Currently Working Here */}
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={e => updateExperience(exp.id, { current: e.target.checked, end: e.target.checked ? 'Present' : '' })}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  I currently work here
                </label>

                {/* Bullets One Per Line with AI & Undo */}
                <div>
                  <AiActionHeader
                    label="Bullets (One per line)"
                    loading={loadingKey === expKey}
                    canUndo={Boolean(undoMap[expKey])}
                    onGenerate={() =>
                      handleAI(expKey, 'bullets', exp.description, val =>
                        updateExperience(exp.id, { description: val })
                      )
                    }
                    onUndo={() =>
                      handleUndo(expKey, oldVal => updateExperience(exp.id, { description: oldVal }))
                    }
                  />
                  <textarea
                    value={exp.description}
                    onChange={e => updateExperience(exp.id, { description: e.target.value })}
                    placeholder={`• Spearheaded migration of client app to React 19, improving latency by 38%\n• Led cross-functional team of 6 engineers across product sprints\n• Mentored junior engineers and designed internal component design system`}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      lineHeight: 1.6,
                      resize: 'vertical',
                      fontFamily: 'var(--font-ui)',
                      transition: 'border-color 150ms, box-shadow 150ms',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-ring)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Add Experience Button */}
          <button
            type="button"
            onClick={addExperience}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px dashed var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'var(--color-primary)'
              e.currentTarget.style.background = 'var(--color-primary-subtle)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Plus size={15} /> Add Experience
          </button>
        </div>
      </Section>

      {/* 5. Projects Section */}
      <Section title="Projects" icon={FolderGit2} badge={profile.projects.length} defaultOpen={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {profile.projects.map((proj, idx) => {
            const projKey = `proj-${proj.id}`
            return (
              <div
                key={proj.id}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header with Title & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {proj.title || `Project #${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProject(proj.id)}
                    title="Remove project"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'transparent',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-text-muted)'
                      e.currentTarget.style.color = 'var(--color-text)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                    }}
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <Field
                    label="Project Title"
                    value={proj.title || proj.name || ''}
                    onChange={v => updateProject(proj.id, { title: v, name: v })}
                    placeholder="e.g. AI Workflow Engine"
                  />
                  <Field
                    label="Live URL / Repository"
                    type="url"
                    value={proj.url || proj.demoUrl || ''}
                    onChange={v => updateProject(proj.id, { url: v, demoUrl: v })}
                    placeholder="https://github.com/..."
                  />
                </div>

                {/* Tech Stack / Tags */}
                <div>
                  <label style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Tags / Technologies (Comma-separated)
                  </label>
                  <input
                    value={(proj.tags || proj.tech || []).join(', ')}
                    onChange={e =>
                      updateProject(proj.id, {
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                      })
                    }
                    placeholder="React, TypeScript, Tailwind, Python"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Project Description with AI & Undo */}
                <div>
                  <AiActionHeader
                    label="Project Highlights & Description"
                    loading={loadingKey === projKey}
                    canUndo={Boolean(undoMap[projKey])}
                    onGenerate={() =>
                      handleAI(projKey, 'project', proj.description, val =>
                        updateProject(proj.id, { description: val })
                      )
                    }
                    onUndo={() =>
                      handleUndo(projKey, oldVal => updateProject(proj.id, { description: oldVal }))
                    }
                  />
                  <textarea
                    value={proj.description}
                    onChange={e => updateProject(proj.id, { description: e.target.value })}
                    placeholder="Describe the purpose, architecture, impact, or outcomes of this project..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      lineHeight: 1.6,
                      resize: 'vertical',
                      fontFamily: 'var(--font-ui)',
                      transition: 'border-color 150ms, box-shadow 150ms',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-ring)'
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Add Project Button */}
          <button
            type="button"
            onClick={addProject}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px dashed var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'var(--color-primary)'
              e.currentTarget.style.background = 'var(--color-primary-subtle)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Plus size={15} /> Add Project
          </button>
        </div>
      </Section>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Right Pane: Live A4 Preview & Action Controls
  // ─────────────────────────────────────────────────────────────────────────────
  const RightPane = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg)',
      borderLeft: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Top Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        flexShrink: 0,
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {/* Template Select: Classic (single column) & Modern (black sidebar) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Template:
          </span>
          <div style={{
            display: 'flex',
            gap: '3px',
            padding: '3px',
            borderRadius: '8px',
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
          }}>
            <button
              type="button"
              onClick={() => handleTemplateChange('classic')}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: template === 'classic' ? 'var(--color-primary)' : 'transparent',
                color: template === 'classic' ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                transition: 'all 150ms',
              }}
            >
              Classic (Single Column)
            </button>
            <button
              type="button"
              onClick={() => handleTemplateChange('modern')}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: template === 'modern' ? 'var(--color-primary)' : 'transparent',
                color: template === 'modern' ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                transition: 'all 150ms',
              }}
            >
              Modern (Black Sidebar)
            </button>
          </div>
        </div>

        {/* Autosave Status */}
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          color: autosaveStatus === 'saved' ? 'var(--color-primary)' : 'var(--color-text-muted)',
          padding: '4px 8px',
          borderRadius: '6px',
          background: 'var(--color-elevated)',
          border: '1px solid var(--color-border)',
        }}>
          {autosaveStatus === 'saving' && (
            <>
              <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" />
              <span>Saving…</span>
            </>
          )}
          {autosaveStatus === 'saved' && (
            <>
              <Check size={12} className="text-[var(--color-primary)]" />
              <span>Saved</span>
            </>
          )}
          {autosaveStatus === 'idle' && (
            <>
              <Cloud size={12} />
              <span>Autosave on</span>
            </>
          )}
        </div>

        {/* Zoom & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {/* Zoom controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-elevated)',
          }}>
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.08).toFixed(2))))}
              title="Zoom out"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                borderRadius: '4px',
              }}
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '0 4px', color: 'var(--color-text-muted)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(1.2, Number((z + 0.08).toFixed(2))))}
              title="Zoom in"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                borderRadius: '4px',
              }}
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(0.74)}
              title="Reset Zoom"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                borderRadius: '4px',
              }}
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Download PDF button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '7px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-elevated)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'var(--color-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text)'
            }}
          >
            <Download size={13} /> Download PDF
          </button>

          {/* Done button */}
          <button
            type="button"
            onClick={handleDone}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '7px',
              border: 'none',
              background: 'var(--color-primary)',
              color: 'var(--color-text-inverse)',
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
          >
            <Check size={13} /> Done
          </button>
        </div>
      </div>

      {/* A4 Canvas Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'auto',
        padding: '30px 20px',
        background: '#18181b',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}>
        <div style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          transition: 'transform 100ms ease-out',
          marginBottom: '200px',
        }}>
          {/* Printable A4 Sheet container */}
          <div
            id="resume-print-root"
            style={{
              width: '210mm',
              minHeight: '297mm',
              background: '#ffffff',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.05)',
              borderRadius: '2px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {template === 'classic' ? (
              <ClassicTemplate p={profile} accent={resumeTheme.accent} />
            ) : (
              <ModernTemplate
                p={profile}
                accent={resumeTheme.accent}
                sidebarBg={resumeTheme.bg}
                sidebarText={resumeTheme.text}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      height: 'calc(100vh - 60px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      {/* ── Print Stylesheet ────────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          #resume-print-root,
          #resume-print-root * {
            visibility: visible !important;
          }

          #resume-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            transform: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }

          .resume-sidebar {
            background-color: ${resumeTheme.bg} !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .resume-section {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .resume-item,
          .resume-entry,
          .resume-bullet,
          li,
          p,
          div[class*="resume-"] {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          h1, h2, h3, h4,
          .resume-heading,
          .resume-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          p, li {
            orphans: 3 !important;
            widows: 3 !important;
          }
        }

        @media (max-width: 1023px) {
          .editor-mobile-toggle {
            display: flex !important;
          }
          .editor-desktop-split {
            display: block !important;
          }
        }
        @media (min-width: 1024px) {
          .editor-mobile-toggle {
            display: none !important;
          }
          .editor-desktop-split {
            display: grid !important;
            grid-template-columns: 1fr 1.15fr !important;
          }
        }
      `}</style>

      {/* Editor Top Navigation Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        flexShrink: 0,
      }}>
        {/* Back and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-text)'
              e.currentTarget.style.borderColor = 'var(--color-text-muted)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-text-muted)'
              e.currentTarget.style.borderColor = 'var(--color-border)'
            }}
          >
            <ArrowLeft size={13} /> Dashboard
          </button>
          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} className="text-[var(--color-primary)]" />
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text)',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </span>
          </div>
        </div>

        {/* Mobile Edit / Preview Toggle Tabs */}
        <div
          className="editor-mobile-toggle"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '3px',
            padding: '3px',
            borderRadius: '8px',
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: mobileTab === 'edit' ? 'var(--color-primary)' : 'transparent',
              color: mobileTab === 'edit' ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
              transition: 'all 150ms',
            }}
          >
            <Edit3 size={12} /> Edit
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: mobileTab === 'preview' ? 'var(--color-primary)' : 'transparent',
              color: mobileTab === 'preview' ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
              transition: 'all 150ms',
            }}
          >
            <Eye size={12} /> Preview
          </button>
        </div>
      </div>

      {/* Main Two-Pane Body */}
      <div
        className="editor-desktop-split"
        style={{
          flex: 1,
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {/* Left Pane: Visible if desktop OR if mobileTab === 'edit' */}
        <div
          style={{
            overflowY: 'auto',
            height: '100%',
            display: mobileTab === 'edit' ? 'block' : undefined,
          }}
          className={mobileTab !== 'edit' ? 'hidden lg:block' : ''}
        >
          {LeftPane}
        </div>

        {/* Right Pane: Visible if desktop OR if mobileTab === 'preview' */}
        <div
          style={{
            overflowY: 'auto',
            height: '100%',
            display: mobileTab === 'preview' ? 'block' : undefined,
          }}
          className={mobileTab !== 'preview' ? 'hidden lg:block' : ''}
        >
          {RightPane}
        </div>
      </div>
    </div>
  )
}
