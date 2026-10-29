import { useState, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { setProfile, generateId, upsertDocument, Document } from '@/lib/storage'
import { toast } from '@/components/ui/Toast'
import { FileText, Globe, Layers, Sparkles, ArrowRight, ArrowLeft, SkipForward, Check } from 'lucide-react'

// ─── AI starter content ────────────────────────────────────────────────────────
const AI_STARTER = {
  summary:
    'Passionate software engineer with 4+ years building scalable web applications. I thrive at the intersection of great design and robust engineering, turning complex problems into elegant, user-centred solutions.',
  skills: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'PostgreSQL', 'Git', 'REST APIs', 'Figma'],
  project: {
    id: generateId(),
    title: 'Open-Source Portfolio Builder',
    url: 'https://github.com/example/portfolio',
    description: 'A React + TypeScript app that lets developers generate a live portfolio site from a JSON profile. 200+ GitHub stars.',
    tags: ['React', 'TypeScript', 'Open Source'],
  },
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type Goal     = 'resume' | 'portfolio' | 'both'
type RTemplate = 'classic' | 'modern'
type PTheme    = 'midnight' | 'light' | 'graphite'

interface WizardState {
  // Step 1
  goal: Goal | null
  // Step 2
  name: string; title: string; email: string; location: string; aiEnabled: boolean
  // Step 3
  resumeTemplate: RTemplate; portfolioTheme: PTheme
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh', background: 'var(--color-bg)',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'flex-start', padding: '3rem 1rem 4rem',
  } as CSSProperties,
  wrap: { width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column' as const, gap: '32px' } as CSSProperties,
  card: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: '16px', padding: '32px',
  } as CSSProperties,
  label: { fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '6px' } as CSSProperties,
  input: (err = false): CSSProperties => ({
    width: '100%', padding: '10px 12px', fontSize: '14px',
    borderRadius: '8px', border: `1px solid ${err ? 'var(--color-danger)' : 'var(--color-border)'}`,
    background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
  }),
  btnPrimary: (disabled = false): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '10px 20px', fontSize: '14px', fontWeight: 600,
    borderRadius: '8px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: 'var(--color-primary)', color: 'var(--color-text-inverse)',
    opacity: disabled ? 0.45 : 1, transition: 'background 150ms, opacity 150ms',
  }),
  btnSecondary: (): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '10px 20px', fontSize: '14px', fontWeight: 500,
    borderRadius: '8px', border: '1px solid var(--color-border)',
    background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer',
    transition: 'border-color 150ms, color 150ms',
  }),
  btnGhost: (): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '10px 16px', fontSize: '13px', fontWeight: 500,
    borderRadius: '8px', border: 'none', background: 'transparent',
    color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'color 150ms',
  }),
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Step labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {['Goal', 'Profile', 'Templates'].map((label, i) => {
          const done    = i < step
          const current = i === step - 1
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px',
                fontFamily: 'var(--font-mono)', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done || current ? 'var(--color-primary)' : 'var(--color-border)',
                color: done || current ? '#000' : 'var(--color-text-muted)',
                transition: 'background 300ms',
              }}>
                {done ? <Check size={11} strokeWidth={3} /> : i + 1}
              </div>
              <span style={{
                fontSize: '12px', fontWeight: current ? 600 : 400,
                color: current ? 'var(--color-text)' : done ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'color 300ms',
              }}>{label}</span>
            </div>
          )
        })}
      </div>
      {/* Bar */}
      <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: 'var(--color-primary)',
          borderRadius: '999px',
          transition: 'width 400ms cubic-bezier(.4,0,.2,1)',
          boxShadow: '0 0 8px rgba(34,197,94,.5)',
        }} />
      </div>
    </div>
  )
}

function GoalCard({ id, icon: Icon, title, desc, selected, onClick }: {
  id: Goal; icon: React.ElementType; title: string; desc: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%',
        padding: '18px 20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
        border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: selected ? 'var(--color-primary-subtle)' : 'var(--color-elevated)',
        transition: 'border-color 150ms, background 150ms',
        outline: 'none',
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? 'rgba(34,197,94,.25)' : 'var(--color-border)',
        transition: 'background 150ms',
      }}>
        <Icon size={18} color={selected ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
      </div>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: selected ? 'var(--color-primary)' : 'var(--color-text)', marginBottom: '2px' }}>{title}</p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</p>
      </div>
      {selected && (
        <div style={{ marginLeft: 'auto', flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={11} strokeWidth={3} color="#000" />
        </div>
      )}
    </button>
  )
}

function TemplateCard({ label, selected, onClick, preview }: {
  label: string; selected: boolean; onClick: () => void; preview: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer',
        border: `1.5px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: '12px', overflow: 'hidden', background: 'none', padding: 0,
        transition: 'border-color 150ms',
        outline: selected ? '2px solid var(--color-primary)' : 'none',
        outlineOffset: '2px',
      }}
    >
      <div style={{ height: '90px', overflow: 'hidden', position: 'relative' }}>
        {preview}
        {selected && (
          <div style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={11} strokeWidth={3} color="#000" />
          </div>
        )}
      </div>
      <p style={{ padding: '0 12px 10px', fontSize: '12px', fontWeight: 600, color: selected ? 'var(--color-primary)' : 'var(--color-text-muted)', textAlign: 'center' }}>{label}</p>
    </button>
  )
}

// ── Template mini-previews ────────────────────────────────────────────────────
const ResumeClassicPreview = () => (
  <div style={{ background: '#fff', width: '100%', height: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ height: '8px', width: '55%', background: '#1a1a1a', borderRadius: '2px' }} />
    <div style={{ height: '5px', width: '40%', background: '#22C55E', borderRadius: '2px' }} />
    <div style={{ height: '1px', background: '#e4e4e7', margin: '4px 0' }} />
    <div style={{ display: 'flex', gap: '6px' }}>
      <div style={{ width: '30%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[60, 80, 45].map((w, i) => <div key={i} style={{ height: '4px', width: `${w}%`, background: '#d4d4d8', borderRadius: '2px' }} />)}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[100, 85, 70, 90].map((w, i) => <div key={i} style={{ height: '4px', width: `${w}%`, background: '#e4e4e7', borderRadius: '2px' }} />)}
      </div>
    </div>
  </div>
)
const ResumeModernPreview = () => (
  <div style={{ background: '#0f172a', width: '100%', height: '100%', padding: '10px 12px', display: 'flex', gap: '8px' }}>
    <div style={{ width: '32%', background: '#1e293b', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#22C55E', margin: '0 auto 4px' }} />
      {[70, 55, 80].map((w, i) => <div key={i} style={{ height: '3px', width: `${w}%`, background: '#334155', borderRadius: '2px' }} />)}
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
      <div style={{ height: '6px', width: '70%', background: '#f1f5f9', borderRadius: '2px' }} />
      <div style={{ height: '4px', width: '50%', background: '#22C55E', borderRadius: '2px' }} />
      {[100, 85, 70].map((w, i) => <div key={i} style={{ height: '3px', width: `${w}%`, background: '#334155', borderRadius: '2px', marginTop: '2px' }} />)}
    </div>
  </div>
)
const PortfolioMidnightPreview = () => (
  <div style={{ background: '#0A0A0B', width: '100%', height: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px rgba(34,197,94,.5)' }} />
    <div style={{ height: '5px', width: '50%', background: '#F4F4F5', borderRadius: '2px' }} />
    <div style={{ height: '3px', width: '35%', background: '#22C55E', borderRadius: '2px' }} />
    <div style={{ height: '3px', width: '65%', background: '#26262B', borderRadius: '2px' }} />
  </div>
)
const PortfolioLightPreview = () => (
  <div style={{ background: '#FAFAFA', width: '100%', height: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#16A34A' }} />
    <div style={{ height: '5px', width: '50%', background: '#0A0A0B', borderRadius: '2px' }} />
    <div style={{ height: '3px', width: '35%', background: '#16A34A', borderRadius: '2px' }} />
    <div style={{ height: '3px', width: '65%', background: '#E4E4E7', borderRadius: '2px' }} />
  </div>
)
const PortfolioGraphitePreview = () => (
  <div style={{ background: '#1c1c1e', width: '100%', height: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#6b7280' }} />
    <div style={{ height: '5px', width: '50%', background: '#f9fafb', borderRadius: '2px' }} />
    <div style={{ height: '3px', width: '35%', background: '#22C55E', borderRadius: '2px' }} />
    <div style={{ height: '3px', width: '65%', background: '#374151', borderRadius: '2px' }} />
  </div>
)

// ─── Main Wizard ───────────────────────────────────────────────────────────────
export function OnboardingPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [step, setStep]   = useState(1)  // 1, 2, 3
  const TOTAL = 3

  const [state, setState] = useState<WizardState>({
    goal: null,
    name: user?.name || '', title: '', email: user?.email || '', location: '',
    aiEnabled: false,
    resumeTemplate: 'classic', portfolioTheme: 'midnight',
  })
  const [busy, setBusy] = useState(false)

  const upd = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }))

  const applyAI = (enabled: boolean) => {
    if (enabled) {
      upd({ aiEnabled: true })
      // Small delay for effect
      setTimeout(() => {
        setProfile_local(true)
      }, 50)
    } else {
      upd({ aiEnabled: false })
    }
  }

  const [aiApplied, setAiApplied] = useState(false)
  const setProfile_local = (on: boolean) => setAiApplied(on)

  // ── Navigation ───────────────────────────────────────────────────────────────
  const canContinue = () => {
    if (step === 1) return !!state.goal
    if (step === 2) return !!state.name.trim()
    return true
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL))
  const back = () => setStep(s => Math.max(s - 1, 1))
  const skip = () => {
    if (step === 2) { upd({ aiEnabled: false }); setStep(3); return }
    if (step < TOTAL) next()
  }

  // ── Finish ───────────────────────────────────────────────────────────────────
  const finish = async () => {
    setBusy(true)
    try {
      // Build profile
      const slug = (state.name.trim().toLowerCase().replace(/\s+/g, '-') || 'user')
      setProfile({
        id: 'me',
        name: state.name,
        email: state.email,
        headline: state.title,
        location: state.location,
        website: '',
        avatar: '',
        summary: aiApplied ? AI_STARTER.summary : '',
        skills:  aiApplied ? AI_STARTER.skills  : [],
        experience: [],
        projects: aiApplied ? [AI_STARTER.project] : [],
        education: [],
      })

      const createdDocs: Document[] = []

      if (state.goal === 'resume' || state.goal === 'both') {
        const id = generateId()
        const doc: Document = {
          id, type: 'resume', title: 'My Resume',
          template: state.resumeTemplate,
          live: false, slug: `${slug}-resume-${id}`,
          editedAt: new Date().toISOString(),
        }
        upsertDocument(doc)
        createdDocs.push(doc)
      }

      if (state.goal === 'portfolio' || state.goal === 'both') {
        const id = generateId()
        const doc: Document = {
          id, type: 'portfolio', title: 'My Portfolio',
          template: state.portfolioTheme,
          live: false, slug: `${slug}-portfolio-${id}`,
          editedAt: new Date().toISOString(),
        }
        upsertDocument(doc)
        createdDocs.push(doc)
      }

      toast.success("You're all set! Let's build something great.")

      // Open first created doc
      const first = createdDocs[0]
      if (first) {
        navigate(first.type === 'resume' ? `/resume/${first.id}` : `/portfolio/${first.id}`)
      } else {
        navigate('/dashboard')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // ── Step 1: Goal ─────────────────────────────────────────────────────────────
  const Step1 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ marginBottom: '4px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          What do you want to build?
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>You can change this later or create more from your dashboard.</p>
      </div>
      <GoalCard id="resume"    icon={FileText} selected={state.goal === 'resume'}    onClick={() => upd({ goal: 'resume' })}
        title="Resume"    desc="An ATS-optimised, shareable resume in PDF-ready templates." />
      <GoalCard id="portfolio" icon={Globe}    selected={state.goal === 'portfolio'} onClick={() => upd({ goal: 'portfolio' })}
        title="Portfolio" desc="A live, public website showcasing your projects and story." />
      <GoalCard id="both"      icon={Layers}   selected={state.goal === 'both'}      onClick={() => upd({ goal: 'both' })}
        title="Both"      desc="Get the full kit — a polished resume and a live portfolio site." />
    </div>
  )

  // ── Step 2: Profile + AI ──────────────────────────────────────────────────────
  const Field = ({ label, value, onChange, placeholder, type = 'text', required = false }: {
    label: string; value: string; onChange: (v: string) => void
    placeholder?: string; type?: string; required?: boolean
  }) => {
    const [focused, setFocused] = useState(false)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={S.label}>
          {label}{required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}
        </label>
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={e => { setFocused(true); e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-ring)' }}
          onBlur={e  => { setFocused(false); e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
          style={{ ...S.input(), ...(focused ? { borderColor: 'var(--color-primary)' } : {}) }}
        />
      </div>
    )
  }

  const Step2 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Tell us about yourself
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>This fills your profile. You can edit everything later.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Full name" value={state.name} onChange={v => upd({ name: v })} placeholder="Your Name" required />
        </div>
        <Field label="Professional title" value={state.title}    onChange={v => upd({ title: v })}    placeholder="e.g. Frontend Engineer" />
        <Field label="Email"              value={state.email}    onChange={v => upd({ email: v })}    placeholder="you@example.com" type="email" />
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Location"         value={state.location} onChange={v => upd({ location: v })} placeholder="City, Country" />
        </div>
      </div>

      {/* AI toggle */}
      <div style={{
        padding: '16px 18px', borderRadius: '12px',
        border: `1.5px solid ${state.aiEnabled ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: state.aiEnabled ? 'var(--color-primary-subtle)' : 'var(--color-elevated)',
        transition: 'border-color 200ms, background 200ms',
        display: 'flex', alignItems: 'flex-start', gap: '14px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: state.aiEnabled ? 'rgba(34,197,94,.2)' : 'var(--color-border)',
          transition: 'background 200ms',
        }}>
          <Sparkles size={18} color={state.aiEnabled ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: state.aiEnabled ? 'var(--color-primary)' : 'var(--color-text)', marginBottom: '2px' }}>
            Start with AI content
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Pre-fills a sample summary, 8 skills, and a demo project you can edit. Great for exploring the editor.
          </p>
          {state.aiEnabled && (
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {AI_STARTER.skills.map(s => (
                <span key={s} style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                  background: 'rgba(34,197,94,.15)', color: 'var(--color-primary)', border: '1px solid rgba(34,197,94,.3)',
                }}>{s}</span>
              ))}
            </div>
          )}
        </div>
        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => { const next = !state.aiEnabled; upd({ aiEnabled: next }); setAiApplied(next) }}
          aria-label="Toggle AI starter content"
          style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none', flexShrink: 0,
            background: state.aiEnabled ? 'var(--color-primary)' : 'var(--color-border)',
            cursor: 'pointer', position: 'relative', transition: 'background 200ms',
          }}
        >
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
            position: 'absolute', top: '3px',
            left: state.aiEnabled ? '23px' : '3px',
            transition: 'left 200ms cubic-bezier(.4,0,.2,1)',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          }} />
        </button>
      </div>
    </div>
  )

  // ── Step 3: Templates ─────────────────────────────────────────────────────────
  const showResume    = state.goal === 'resume'    || state.goal === 'both'
  const showPortfolio = state.goal === 'portfolio' || state.goal === 'both'

  const Step3 = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Choose your look
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>You can switch templates any time from the editor.</p>
      </div>

      {showResume && (
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
            Resume template
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <TemplateCard label="Classic" selected={state.resumeTemplate === 'classic'} onClick={() => upd({ resumeTemplate: 'classic' })} preview={<ResumeClassicPreview />} />
            <TemplateCard label="Modern"  selected={state.resumeTemplate === 'modern'}  onClick={() => upd({ resumeTemplate: 'modern'  })} preview={<ResumeModernPreview />} />
          </div>
        </div>
      )}

      {showPortfolio && (
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
            Portfolio theme
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <TemplateCard label="Midnight" selected={state.portfolioTheme === 'midnight'} onClick={() => upd({ portfolioTheme: 'midnight' })} preview={<PortfolioMidnightPreview />} />
            <TemplateCard label="Light"    selected={state.portfolioTheme === 'light'}    onClick={() => upd({ portfolioTheme: 'light'    })} preview={<PortfolioLightPreview />} />
            <TemplateCard label="Graphite" selected={state.portfolioTheme === 'graphite'} onClick={() => upd({ portfolioTheme: 'graphite' })} preview={<PortfolioGraphitePreview />} />
          </div>
        </div>
      )}
    </div>
  )

  // ── Nav row ───────────────────────────────────────────────────────────────────
  const isLast = step === TOTAL
  const showSkip = step === 2   // only Step 2 has skip

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
            Step {step} of {TOTAL}
          </p>
          <ProgressBar step={step} total={TOTAL} />
        </div>

        {/* Card */}
        <div style={S.card}>
          {step === 1 && Step1}
          {step === 2 && Step2}
          {step === 3 && Step3}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Back */}
          <button
            type="button" onClick={back}
            style={{ ...S.btnSecondary(), visibility: step === 1 ? 'hidden' : 'visible' }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {showSkip && (
              <button type="button" onClick={skip} style={S.btnGhost()}>
                <SkipForward size={13} /> Skip
              </button>
            )}
            {!isLast ? (
              <button
                type="button" onClick={next}
                disabled={!canContinue()}
                style={S.btnPrimary(!canContinue())}
                onMouseEnter={e => { if (canContinue()) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button" onClick={finish}
                disabled={busy}
                style={S.btnPrimary(busy)}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
              >
                {busy ? 'Creating…' : <><Check size={14} /> Finish & open editor</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
