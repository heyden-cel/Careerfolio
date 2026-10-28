import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import {
  Zap, MapPin, Mail, Phone, ExternalLink,
  FolderGit2
} from 'lucide-react'
import { getDocuments, getProfile, Profile, AchievementType, normalizeSkills } from '@/lib/storage'
import { resolvePalette, DEFAULT_PALETTE_ID } from '@/lib/palettes'
import { toast } from '@/components/ui/Toast'

function Github({ size = 14, className = '', style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  )
}

function Linkedin({ size = 14, className = '', style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

const ACHIEVEMENT_LABELS: Record<AchievementType, string> = {
  certificate: 'Certificates',
  award: 'Awards',
  hackathon: 'Hackathons',
  workshop: 'Workshops',
  publication: 'Publications',
}

export function PublicPortfolioPage() {
  const { slug } = useParams()
  const allDocs = getDocuments()
  const doc = allDocs.find(d => d.slug === slug)
  const profile: Profile = useMemo(() => getProfile(), [])

  // Achievement Filter
  const [achievementFilter, setAchievementFilter] = useState<string>('all')

  // Contact Form State
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [isSubmittingContact, setIsSubmittingContact] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  if (!doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center" style={{ background: '#0A0A0B', color: '#F4F4F5' }}>
        <Zap size={36} className="text-[#22C55E]" />
        <h1 className="text-2xl font-bold">Portfolio not found</h1>
        <p className="text-[#A1A1AA] text-sm max-w-sm">We couldn't find a portfolio at this URL. The link may be incorrect or has been removed.</p>
        <Link to="/" className="text-[#22C55E] hover:underline text-sm font-medium">← Return home</Link>
      </div>
    )
  }

  if (!doc.live) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center" style={{ background: '#0A0A0B', color: '#F4F4F5' }}>
        <Zap size={36} className="text-[#22C55E]" />
        <h1 className="text-2xl font-bold">Portfolio is unpublished</h1>
        <p className="text-[#A1A1AA] text-sm max-w-sm">This portfolio is currently private or has been unpublished by the author.</p>
        <Link to="/" className="text-[#22C55E] hover:underline text-sm font-medium">← Return home</Link>
      </div>
    )
  }

  // ── Resolve Palette & CSS Variables ──
  const palette = resolvePalette(doc.palette || doc.template || DEFAULT_PALETTE_ID, doc.accent, doc.accent2)

  const sections = doc.sections || {
    hero: true,
    skills: true,
    projects: true,
    education: true,
    achievements: true,
    contact: true,
  }

  const sectionOrder = doc.sectionOrder || ['hero', 'skills', 'projects', 'education', 'achievements', 'contact']
  const catSkills = normalizeSkills(profile.skills)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast.error('Please fill out all required fields.')
      return
    }

    setIsSubmittingContact(true)
    try {
      await axios.post('/api/contact', {
        name: contactName,
        email: contactEmail,
        message: contactMessage,
      })
      setContactSent(true)
      toast.success('Message sent successfully! Thank you for reaching out.')
      setContactName('')
      setContactEmail('')
      setContactMessage('')
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.error || 'Failed to send message. Please try again.')
    } finally {
      setIsSubmittingContact(false)
    }
  }

  // Check section visibility & non-emptiness
  const isSectionVisible = (secId: string): boolean => {
    if (sections[secId] === false) return false
    switch (secId) {
      case 'hero':
        return true
      case 'skills':
        return (
          catSkills.technical.length > 0 ||
          catSkills.frameworks.length > 0 ||
          catSkills.tools.length > 0 ||
          catSkills.soft.length > 0
        )
      case 'projects':
        return (profile.projects || []).length > 0
      case 'education':
        return (profile.education || []).length > 0
      case 'achievements':
        return (profile.achievements || []).length > 0
      case 'contact':
        return true
      default:
        return false
    }
  }

  const enabledSections = sectionOrder.filter(isSectionVisible)

  // Filtered achievements
  const achievements = profile.achievements || []
  const filteredAchievements = achievementFilter === 'all'
    ? achievements
    : achievements.filter(a => a.type === achievementFilter)

  // Achievement type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: achievements.length }
    achievements.forEach(a => {
      counts[a.type] = (counts[a.type] || 0) + 1
    })
    return counts
  }, [achievements])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div
      className="min-h-screen text-[15px] antialiased"
      style={{
        ...palette.cssVariables,
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: `'Inter', system-ui, -apple-system, sans-serif`,
      }}
    >
      {/* Background radial glow using --accent */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse 70% 45% at 50% 0%, var(--accent-tint) 0%, transparent 70%)`,
        }}
      />

      {/* ── Sticky Top Navigation Bar ── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b px-6 py-3.5 transition-colors"
        style={{
          background: 'var(--bg)',
          borderColor: 'var(--surface)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 font-bold tracking-tight text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text)' }}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow-sm"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {(profile.name || 'P')[0]?.toUpperCase()}
            </span>
            <span>{profile.name || 'Portfolio'}</span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
            {enabledSections.map(secId => {
              const label = secId === 'hero' ? 'Home' : secId.charAt(0).toUpperCase() + secId.slice(1)
              return (
                <button
                  key={secId}
                  onClick={() => scrollToSection(secId)}
                  className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  {label}
                </button>
              )
            })}
          </nav>

          {/* Quick Contact Button */}
          {sections.contact !== false && (
            <button
              onClick={() => scrollToSection('contact')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
              }}
            >
              <Mail size={13} />
              <span>Contact</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-24 relative">
        {sectionOrder.map(secId => {
          if (!isSectionVisible(secId)) return null

          switch (secId) {
            // ─────────────────────────────────────────────────────────────────
            // 1. HERO SECTION
            // ─────────────────────────────────────────────────────────────────
            case 'hero':
              return (
                <section
                  key="hero"
                  id="hero"
                  className="pt-6 sm:pt-12 flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12 scroll-mt-24"
                >
                  {/* Photo or Styled Initials Avatar */}
                  <div className="shrink-0 relative">
                    {profile.hero?.photoUrl ? (
                      <img
                        src={profile.hero.photoUrl}
                        alt={profile.name || 'Profile photo'}
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 shadow-xl"
                        style={{ borderColor: 'var(--accent)' }}
                      />
                    ) : (
                      <div
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl flex items-center justify-center text-5xl font-black shadow-xl"
                        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                      >
                        {(profile.name || 'P')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div
                      className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider shadow-md flex items-center gap-1"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--surface)',
                        color: 'var(--accent)',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                      Available
                    </div>
                  </div>

                  {/* Hero Information */}
                  <div className="flex-1 text-center sm:text-left flex flex-col items-center sm:items-start">
                    <h1
                      className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-2"
                      style={{ color: 'var(--text)' }}
                    >
                      {profile.name || 'Your Name'}
                    </h1>
                    <p
                      className="text-lg sm:text-xl font-semibold mb-3"
                      style={{ color: 'var(--accent)' }}
                    >
                      {profile.headline || 'Full Stack Engineer & Builder'}
                    </p>

                    {/* Tagline */}
                    {profile.hero?.tagline && (
                      <p
                        className="text-base sm:text-lg leading-relaxed max-w-2xl mb-6 font-normal"
                        style={{ color: 'var(--muted)' }}
                      >
                        {profile.hero.tagline}
                      </p>
                    )}

                    {/* Location & Summary if present */}
                    {profile.summary && !profile.hero?.tagline && (
                      <p
                        className="text-base leading-relaxed max-w-2xl mb-6 font-normal"
                        style={{ color: 'var(--muted)' }}
                      >
                        {profile.summary}
                      </p>
                    )}

                    {/* Socials & Profiles */}
                    {((profile.hero?.socials && profile.hero.socials.length > 0) || profile.contact?.github || profile.contact?.linkedin) && (
                      <div className="flex flex-wrap gap-2.5 mb-8 justify-center sm:justify-start">
                        {profile.contact?.github && (
                          <a
                            href={profile.contact.github.startsWith('http') ? profile.contact.github : `https://${profile.contact.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border hover:border-[var(--accent)] transition-all"
                            style={{ background: 'var(--surface)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}
                          >
                            <Github size={13} />
                            <span>GitHub</span>
                          </a>
                        )}
                        {profile.contact?.linkedin && (
                          <a
                            href={profile.contact.linkedin.startsWith('http') ? profile.contact.linkedin : `https://${profile.contact.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border hover:border-[var(--accent)] transition-all"
                            style={{ background: 'var(--surface)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}
                          >
                            <Linkedin size={13} />
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {profile.hero?.socials?.map(s => (
                          <a
                            key={s.id}
                            href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border hover:border-[var(--accent)] transition-all"
                            style={{ background: 'var(--surface)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text)' }}
                          >
                            <ExternalLink size={12} />
                            <span>{s.label}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons: "View Projects" and "Contact Me" */}
                    <div className="flex flex-wrap items-center gap-3.5 justify-center sm:justify-start">
                      {sections.projects !== false && (profile.projects || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => scrollToSection('projects')}
                          className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                          style={{
                            background: 'var(--accent)',
                            color: 'var(--on-accent)',
                          }}
                        >
                          <FolderGit2 size={16} />
                          <span>View Projects</span>
                        </button>
                      )}

                      {sections.contact !== false && (
                        <button
                          type="button"
                          onClick={() => scrollToSection('contact')}
                          className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all hover:bg-white/5 active:scale-95"
                          style={{
                            borderColor: 'var(--surface)',
                            color: 'var(--text)',
                            background: 'var(--surface)',
                          }}
                        >
                          <Mail size={16} />
                          <span>Contact Me</span>
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              )

            // ─────────────────────────────────────────────────────────────────
            // 2. SKILLS SECTION (4 Categories with level indicator dots)
            // ─────────────────────────────────────────────────────────────────
            case 'skills': {
              const skillCategories = [
                { id: 'technical', label: 'Technical Skills', items: catSkills.technical },
                { id: 'frameworks', label: 'Frameworks & Libraries', items: catSkills.frameworks },
                { id: 'tools', label: 'Developer Tools & Platforms', items: catSkills.tools },
                { id: 'soft', label: 'Core & Soft Skills', items: catSkills.soft },
              ].filter(c => c.items.length > 0)

              if (skillCategories.length === 0) return null

              return (
                <section key="skills" id="skills" className="scroll-mt-24">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                      02 · Expertise
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8" style={{ color: 'var(--text)' }}>
                    Skills & Technologies
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {skillCategories.map(cat => (
                      <div
                        key={cat.id}
                        className="p-6 rounded-2xl border flex flex-col gap-4 shadow-sm"
                        style={{
                          background: 'var(--surface)',
                          borderColor: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                          <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--text)' }}>
                            {cat.label}
                          </span>
                          <span
                            className="text-xs font-mono px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
                          >
                            {cat.items.length}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          {cat.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                              style={{
                                background: 'var(--bg)',
                                borderColor: 'rgba(255,255,255,0.08)',
                                color: 'var(--text)',
                              }}
                            >
                              <span>{item.name}</span>
                              {item.level && item.level > 0 && (
                                <div className="flex items-center gap-1 pl-1 border-l" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                  {[1, 2, 3, 4, 5].map(dot => (
                                    <span
                                      key={dot}
                                      className="w-1.5 h-1.5 rounded-full transition-colors"
                                      style={{
                                        background: dot <= (item.level || 0) ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            }

            // ─────────────────────────────────────────────────────────────────
            // 3. PROJECTS SECTION (Card per project, role, objectives, links)
            // ─────────────────────────────────────────────────────────────────
            case 'projects': {
              const projects = profile.projects || []
              if (projects.length === 0) return null

              return (
                <section key="projects" id="projects" className="scroll-mt-24">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                      03 · Showcase
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8" style={{ color: 'var(--text)' }}>
                    Featured Projects
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                    {projects.map(proj => {
                      const pName = proj.name || proj.title || 'Untitled Project'
                      const pTech = proj.tech && proj.tech.length > 0 ? proj.tech : (proj.tags || [])
                      const pGithub = proj.githubUrl
                      const pDemo = proj.demoUrl || proj.url

                      return (
                        <div
                          key={proj.id}
                          className="rounded-2xl border overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'rgba(255,255,255,0.06)',
                          }}
                        >
                          {/* Project Thumbnail if available */}
                          {proj.thumbnail && (
                            <div className="w-full h-48 bg-black/40 overflow-hidden relative border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                              <img
                                src={proj.thumbnail}
                                alt={pName}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                            </div>
                          )}

                          <div className="p-6 flex-1 flex flex-col">
                            {/* Title & Role */}
                            <div className="mb-3">
                              <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                                {pName}
                              </h3>
                              {proj.role && (
                                <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--accent)' }}>
                                  {proj.role}
                                </p>
                              )}
                            </div>

                            {/* Description */}
                            {proj.description && (
                              <p className="text-xs sm:text-sm leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
                                {proj.description}
                              </p>
                            )}

                            {/* Objectives / Outcomes */}
                            {proj.objectives && (
                              <div
                                className="p-3 rounded-xl text-xs leading-relaxed mb-4 border"
                                style={{
                                  background: 'var(--bg)',
                                  borderColor: 'rgba(255,255,255,0.08)',
                                  color: 'var(--text)',
                                }}
                              >
                                <span className="font-semibold block mb-1 text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                                  Objective & Impact
                                </span>
                                {proj.objectives}
                              </div>
                            )}

                            {/* Tech Stack Chips */}
                            {pTech.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-6 mt-auto pt-2">
                                {pTech.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[11px] font-mono px-2.5 py-0.5 rounded-md"
                                    style={{
                                      background: 'var(--accent-tint)',
                                      color: 'var(--accent)',
                                      border: '1px solid var(--accent)30',
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action Buttons: GitHub & Demo */}
                            {(pGithub || pDemo) && (
                              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                {pGithub && (
                                  <a
                                    href={pGithub.startsWith('http') ? pGithub : `https://${pGithub}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:border-[var(--accent)] transition-colors"
                                    style={{
                                      background: 'var(--bg)',
                                      borderColor: 'rgba(255,255,255,0.08)',
                                      color: 'var(--text)',
                                    }}
                                  >
                                    <Github size={13} />
                                    <span>Code</span>
                                  </a>
                                )}

                                {pDemo && (
                                  <a
                                    href={pDemo.startsWith('http') ? pDemo : `https://${pDemo}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm ml-auto active:scale-95"
                                    style={{
                                      background: 'var(--accent)',
                                      color: 'var(--on-accent)',
                                    }}
                                  >
                                    <ExternalLink size={13} />
                                    <span>Live Demo</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            }

            // ─────────────────────────────────────────────────────────────────
            // 4. EDUCATION SECTION (Timeline with accent2 node highlights)
            // ─────────────────────────────────────────────────────────────────
            case 'education': {
              const education = profile.education || []
              if (education.length === 0) return null

              return (
                <section key="education" id="education" className="scroll-mt-24">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                      04 · Background
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8" style={{ color: 'var(--text)' }}>
                    Education & Academics
                  </h2>

                  <div className="flex flex-col gap-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--surface)]">
                    {education.map(edu => {
                      const schoolName = edu.school || edu.institution || 'University'
                      const dept = edu.department || edu.field
                      const year = edu.gradYear || edu.end || edu.start

                      return (
                        <div key={edu.id} className="relative pl-9 sm:pl-10">
                          {/* Timeline node in accent2 */}
                          <div
                            className="absolute left-1.5 top-1.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                            style={{
                              background: 'var(--bg)',
                              borderColor: 'var(--accent2)',
                            }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent2)' }} />
                          </div>

                          <div
                            className="p-5 sm:p-6 rounded-2xl border shadow-sm"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'rgba(255,255,255,0.06)',
                            }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                              <div>
                                <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>
                                  {edu.degree}
                                </h3>
                                <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                  {schoolName} {dept ? `· ${dept}` : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mt-1 sm:mt-0">
                                {year && (
                                  <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                                    {year}
                                  </span>
                                )}
                                {edu.cgpa && (
                                  <span
                                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-md"
                                    style={{
                                      background: 'var(--accent-tint)',
                                      color: 'var(--accent)',
                                    }}
                                  >
                                    GPA: {edu.cgpa}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Coursework Chips */}
                            {edu.coursework && edu.coursework.length > 0 && (
                              <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                <span className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--muted)' }}>
                                  Key Coursework
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {edu.coursework.map((course, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2.5 py-1 rounded-lg border font-medium"
                                      style={{
                                        background: 'var(--bg)',
                                        borderColor: 'rgba(255,255,255,0.08)',
                                        color: 'var(--text)',
                                      }}
                                    >
                                      {course}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            }

            // ─────────────────────────────────────────────────────────────────
            // 5. ACHIEVEMENTS & CERTIFICATIONS (Grouped filter chips)
            // ─────────────────────────────────────────────────────────────────
            case 'achievements': {
              const achievementsList = profile.achievements || []
              if (achievementsList.length === 0) return null

              const filterOptions = [
                { id: 'all', label: 'All Achievements' },
                { id: 'certificate', label: 'Certificates' },
                { id: 'award', label: 'Awards' },
                { id: 'hackathon', label: 'Hackathons' },
                { id: 'workshop', label: 'Workshops' },
                { id: 'publication', label: 'Publications' },
              ].filter(opt => opt.id === 'all' || (typeCounts[opt.id] && typeCounts[opt.id] > 0))

              return (
                <section key="achievements" id="achievements" className="scroll-mt-24">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                      05 · Recognition
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6" style={{ color: 'var(--text)' }}>
                    Certifications & Achievements
                  </h2>

                  {/* Filter Chips */}
                  <div className="flex flex-wrap gap-2 mb-8">
                    {filterOptions.map(opt => {
                      const active = achievementFilter === opt.id
                      const count = typeCounts[opt.id] || 0
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAchievementFilter(opt.id)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all border active:scale-95"
                          style={{
                            background: active ? 'var(--accent)' : 'var(--surface)',
                            borderColor: active ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                            color: active ? 'var(--on-accent)' : 'var(--muted)',
                          }}
                        >
                          <span>{opt.label}</span>
                          <span
                            className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                            style={{
                              background: active ? 'rgba(0,0,0,0.2)' : 'var(--bg)',
                              color: active ? 'var(--on-accent)' : 'var(--text)',
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Achievements Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredAchievements.map(item => (
                      <div
                        key={item.id}
                        className="p-5 rounded-2xl border flex flex-col justify-between shadow-sm transition-all hover:border-[var(--accent)]"
                        style={{
                          background: 'var(--surface)',
                          borderColor: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{
                                background: 'var(--accent-tint)',
                                color: 'var(--accent)',
                              }}
                            >
                              {ACHIEVEMENT_LABELS[item.type] || item.type}
                            </span>
                            {item.year && (
                              <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                                {item.year}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-bold leading-snug mb-1" style={{ color: 'var(--text)' }}>
                            {item.title}
                          </h3>
                          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                            {item.issuer}
                          </p>
                        </div>

                        {item.link && (
                          <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                            <a
                              href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline transition-colors"
                              style={{ color: 'var(--accent)' }}
                            >
                              <span>View Credential</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )
            }

            // ─────────────────────────────────────────────────────────────────
            // 6. CONTACT SECTION (Info links + Working Contact Form)
            // ─────────────────────────────────────────────────────────────────
            case 'contact': {
              const c = profile.contact || {
                email: profile.email || '',
                phone: profile.phone || '',
                location: profile.location || '',
                linkedin: '',
                github: '',
              }

              return (
                <section key="contact" id="contact" className="scroll-mt-24">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                      06 · Connect
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8" style={{ color: 'var(--text)' }}>
                    Get in Touch
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Left Column: Direct contact info */}
                    <div className="md:col-span-2 flex flex-col gap-5">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                        Have an opportunity, project proposal, or just want to discuss software engineering? Send a message or connect through any platform below.
                      </p>

                      <div className="flex flex-col gap-3">
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium transition-all hover:border-[var(--accent)]"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: 'var(--text)',
                            }}
                          >
                            <Mail size={16} style={{ color: 'var(--accent)' }} />
                            <span>{c.email}</span>
                          </a>
                        )}

                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium transition-all hover:border-[var(--accent)]"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: 'var(--text)',
                            }}
                          >
                            <Phone size={16} style={{ color: 'var(--accent)' }} />
                            <span>{c.phone}</span>
                          </a>
                        )}

                        {c.location && (
                          <div
                            className="p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: 'var(--muted)',
                            }}
                          >
                            <MapPin size={16} style={{ color: 'var(--accent)' }} />
                            <span>{c.location}</span>
                          </div>
                        )}

                        {c.linkedin && (
                          <a
                            href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium transition-all hover:border-[var(--accent)]"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: 'var(--text)',
                            }}
                          >
                            <Linkedin size={16} style={{ color: 'var(--accent)' }} />
                            <span>LinkedIn Profile</span>
                            <ExternalLink size={12} className="ml-auto opacity-70" />
                          </a>
                        )}

                        {c.github && (
                          <a
                            href={c.github.startsWith('http') ? c.github : `https://${c.github}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium transition-all hover:border-[var(--accent)]"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: 'var(--text)',
                            }}
                          >
                            <Github size={16} style={{ color: 'var(--accent)' }} />
                            <span>GitHub Profile</span>
                            <ExternalLink size={12} className="ml-auto opacity-70" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Working Contact Form */}
                    <div
                      className="md:col-span-3 p-6 sm:p-8 rounded-2xl border shadow-md flex flex-col justify-between"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>
                        Send a Direct Message
                      </h3>

                      {contactSent ? (
                        <div
                          className="py-12 flex flex-col items-center justify-center text-center gap-3 p-6 rounded-xl border"
                          style={{
                            background: 'var(--bg)',
                            borderColor: 'rgba(255,255,255,0.08)',
                          }}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
                          >
                            <Zap size={26} />
                          </div>
                          <h4 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                            Message Received
                          </h4>
                          <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                            Thank you for reaching out! Your message was transmitted successfully.
                          </p>
                          <button
                            type="button"
                            onClick={() => setContactSent(false)}
                            className="mt-2 text-xs font-semibold underline hover:opacity-80"
                            style={{ color: 'var(--accent)' }}
                          >
                            Send another message
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                              Your Name <span style={{ color: 'var(--accent)' }}>*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={contactName}
                              onChange={e => setContactName(e.target.value)}
                              placeholder="Alex Smith"
                              className="px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all"
                              style={{
                                background: 'var(--bg)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                color: 'var(--text)',
                              }}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                              Your Email <span style={{ color: 'var(--accent)' }}>*</span>
                            </label>
                            <input
                              type="email"
                              required
                              value={contactEmail}
                              onChange={e => setContactEmail(e.target.value)}
                              placeholder="alex@example.com"
                              className="px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all"
                              style={{
                                background: 'var(--bg)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                color: 'var(--text)',
                              }}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                              Message <span style={{ color: 'var(--accent)' }}>*</span>
                            </label>
                            <textarea
                              required
                              rows={4}
                              value={contactMessage}
                              onChange={e => setContactMessage(e.target.value)}
                              placeholder="Hi! I saw your portfolio and would love to connect regarding..."
                              className="px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all resize-y"
                              style={{
                                background: 'var(--bg)',
                                borderColor: 'rgba(255,255,255,0.1)',
                                color: 'var(--text)',
                              }}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingContact}
                            className="mt-2 py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 active:scale-95"
                            style={{
                              background: 'var(--accent)',
                              color: 'var(--on-accent)',
                            }}
                          >
                            {isSubmittingContact ? (
                              <>
                                <span className="animate-spin text-sm">⏳</span>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <span>Send Message</span>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </section>
              )
            }

            default:
              return null
          }
        })}

        {/* ── Page Footer ── */}
        <footer
          className="pt-10 pb-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--muted)' }}
        >
          <div className="flex items-center gap-2 font-medium">
            <span>© {new Date().getFullYear()} {profile.name || 'Portfolio'}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <Link
              to="/"
              className="font-bold hover:underline transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              FolioAI
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
