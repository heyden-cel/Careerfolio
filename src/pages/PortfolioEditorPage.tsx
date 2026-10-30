import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Globe, ExternalLink, Sparkles, ArrowLeft,
  Monitor, Smartphone, Plus, Trash2, Mail, Eye, EyeOff,
  FolderGit2, CheckCircle2, ChevronDown, ChevronUp,
  GraduationCap, Award, Upload, ArrowUp, ArrowDown,
  Phone, MapPin, Send
} from 'lucide-react'
import {
  getProfile, setProfile as saveProfile, getDocuments,
  upsertDocument, generateId, Profile, Project, Education,
  Achievement, AchievementType, Document as DocType,
  normalizeSkills, CategorizedSkills, SkillItem, SocialLink
} from '@/lib/storage'
import {
  resolvePalette, PalettePreset, PALETTES,
  DEFAULT_PALETTE_ID
} from '@/lib/palettes'
import { AppearanceCard } from '@/components/AppearanceCard'
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

// ─── Debounce helper ─────────────────────────────────────────────────────────
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
}

// ─── Inline Validation Helpers ───────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUrl(url: string): boolean {
  if (!url) return true
  return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(url)
}

const SECTION_METADATA: Record<string, { title: string; icon: any }> = {
  hero: { title: 'Hero & Bio', icon: Globe },
  skills: { title: 'Skills & Tools', icon: CheckCircle2 },
  projects: { title: 'Projects', icon: FolderGit2 },
  education: { title: 'Education', icon: GraduationCap },
  achievements: { title: 'Certifications & Achievements', icon: Award },
  contact: { title: 'Contact & Links', icon: Mail },
}

const ACHIEVEMENT_TYPES: AchievementType[] = ['certificate', 'award', 'hackathon', 'workshop', 'publication']

export function PortfolioEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // ── Document Initialization ──
  const [doc, setDocState] = useState<DocType>(() => {
    const all = getDocuments()
    const found = all.find(d => d.id === id && d.type === 'portfolio')
    if (found) return found

    const newDoc: DocType = {
      id: id || generateId(),
      type: 'portfolio',
      title: 'Untitled Portfolio',
      template: 'midnight-green',
      palette: DEFAULT_PALETTE_ID,
      live: false,
      slug: `portfolio-${id || 'new'}`,
      editedAt: new Date().toISOString(),
      sections: {
        hero: true,
        skills: true,
        projects: true,
        education: true,
        achievements: true,
        contact: true,
      },
      sectionOrder: ['hero', 'skills', 'projects', 'education', 'achievements', 'contact'],
    }
    upsertDocument(newDoc)
    return newDoc
  })

  // ── States ──
  const [profile, setProfileState] = useState<Profile>(() => getProfile())
  const [slug, setSlug] = useState(doc.slug || `portfolio-${doc.id}`)

  // Palette State & Overrides
  const [paletteId, setPaletteId] = useState<string>(
    doc.palette || (doc.template === 'light' ? 'clean-light' : doc.template === 'graphite' ? 'slate-teal' : DEFAULT_PALETTE_ID)
  )
  const [customAccent, setCustomAccent] = useState<string | undefined>(doc.accent)
  const [customAccent2, setCustomAccent2] = useState<string | undefined>(doc.accent2)

  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')

  const [sections, setSections] = useState<Record<string, boolean>>(() => {
    return {
      hero: doc.sections?.hero ?? true,
      skills: doc.sections?.skills ?? true,
      projects: doc.sections?.projects ?? true,
      education: doc.sections?.education ?? true,
      achievements: doc.sections?.achievements ?? true,
      contact: doc.sections?.contact ?? true,
    }
  })

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    return doc.sectionOrder || ['hero', 'skills', 'projects', 'education', 'achievements', 'contact']
  })

  // Collapsed states for section cards
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hero: true,
    skills: true,
    projects: true,
    education: true,
    achievements: true,
    contact: true,
  })

  // AI Loading State tracking per key (e.g. 'tagline', 'role-1')
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null)

  // Skill input drafts for 4 categories
  const [skillDrafts, setSkillDrafts] = useState<Record<string, string>>({
    technical: '',
    frameworks: '',
    tools: '',
    soft: '',
  })

  // Coursework draft input
  const [courseworkDrafts, setCourseworkDrafts] = useState<Record<string, string>>({})

  // Tech chip draft input
  const [techDrafts, setTechDrafts] = useState<Record<string, string>>({})

  // Preview Contact Form State
  const [previewContactName, setPreviewContactName] = useState('')
  const [previewContactEmail, setPreviewContactEmail] = useState('')
  const [previewContactMessage, setPreviewContactMessage] = useState('')
  const [previewContactSending, setPreviewContactSending] = useState(false)
  const [previewContactSent, setPreviewContactSent] = useState(false)

  // ── Resolved Active Palette ──
  const activePalette = useMemo(
    () => resolvePalette(paletteId, customAccent, customAccent2),
    [paletteId, customAccent, customAccent2]
  )

  // ── Debounced Autosave ──
  const debouncedSave = useCallback(
    debounce((
      p: Profile,
      currentSlug: string,
      currentPal: string,
      acc: string | undefined,
      acc2: string | undefined,
      currentSecs: Record<string, boolean>,
      order: string[]
    ) => {
      saveProfile(p)
      const updatedDoc: DocType = {
        ...doc,
        slug: currentSlug,
        template: currentPal,
        palette: currentPal,
        accent: acc,
        accent2: acc2,
        sections: currentSecs,
        sectionOrder: order,
        editedAt: new Date().toISOString(),
      }
      upsertDocument(updatedDoc)
      setDocState(updatedDoc)
    }, 1000),
    [doc]
  )

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfileState(prev => {
        const next = { ...prev, ...patch }
        debouncedSave(next, slug, paletteId, customAccent, customAccent2, sections, sectionOrder)
        return next
      })
    },
    [slug, paletteId, customAccent, customAccent2, sections, sectionOrder, debouncedSave]
  )

  const toggleSection = (secId: string) => {
    const next = { ...sections, [secId]: !sections[secId] }
    setSections(next)
    debouncedSave(profile, slug, paletteId, customAccent, customAccent2, next, sectionOrder)
  }

  const moveSectionOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sectionOrder.length) return
    const newOrder = [...sectionOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[targetIndex]
    newOrder[targetIndex] = temp
    setSectionOrder(newOrder)
    debouncedSave(profile, slug, paletteId, customAccent, customAccent2, sections, newOrder)
  }

  const handleSlugChange = (raw: string) => {
    const clean = raw.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(clean)
    debouncedSave(profile, clean, paletteId, customAccent, customAccent2, sections, sectionOrder)
  }

  const handlePaletteChange = (newPalId: string, acc?: string, acc2?: string) => {
    setPaletteId(newPalId)
    setCustomAccent(acc)
    setCustomAccent2(acc2)
    debouncedSave(profile, slug, newPalId, acc, acc2, sections, sectionOrder)
  }

  const handleTogglePublish = () => {
    const nextLive = !doc.live
    const nextDoc: DocType = {
      ...doc,
      live: nextLive,
      slug,
      template: paletteId,
      palette: paletteId,
      accent: customAccent,
      accent2: customAccent2,
      sections,
      sectionOrder,
      editedAt: new Date().toISOString(),
    }
    upsertDocument(nextDoc)
    setDocState(nextDoc)
    if (nextLive) {
      toast.success('🎉 Portfolio is now live!')
    } else {
      toast.success('Portfolio unpublished.')
    }
  }

  // ── Image Upload Handler (Max 2MB, image/*, data URL) ──
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image (PNG, JPG, SVG, WebP)')
      e.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB in size.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSuccess(reader.result)
        toast.success('Image uploaded successfully!')
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read image file.')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── AI Generator Calls ──
  const generateAIText = async (
    key: string,
    action: 'tagline' | 'project' | 'role',
    context?: string,
    onSuccess?: (resText: string) => void
  ) => {
    setAiLoadingKey(key)
    try {
      const res = await axios.post('/api/ai', { action, type: action, context })
      const text = res.data?.result || res.data?.tagline || res.data?.description || res.data?.role || res.data?.summary
      if (text && onSuccess) {
        onSuccess(text)
        toast.success('✨ AI generated content updated!')
      } else {
        toast.error(res.data?.error || 'AI returned no text. Please retry.')
      }
    } catch (err: any) {
      console.error('[AI Generator Error]:', err)
      const status = err.response?.status
      const msg = err.response?.data?.error || err.response?.data?.message
      if (status === 500) {
        toast.error(msg || 'AI key missing or invalid')
      } else if (status === 429) {
        toast.error(msg || 'Rate limit reached, please try again')
      } else if (status === 502) {
        toast.error(msg || 'AI returned no text')
      } else {
        toast.error(msg || 'Failed to generate AI suggestion. Please retry.')
      }
    } finally {
      setAiLoadingKey(null)
    }
  }

  // ── Normalized Skills Structure ──
  const catSkills = useMemo(() => normalizeSkills(profile.skills), [profile.skills])

  const updateCategorizedSkills = (cat: keyof CategorizedSkills, items: SkillItem[]) => {
    const next = { ...catSkills, [cat]: items }
    updateProfile({ skills: next })
  }

  const addSkillToCategory = (cat: keyof CategorizedSkills) => {
    const text = (skillDrafts[cat] || '').trim()
    if (!text) return
    const current = catSkills[cat] || []
    if (current.some(s => s.name.toLowerCase() === text.toLowerCase())) {
      toast.error('Skill already exists in this category')
      return
    }
    updateCategorizedSkills(cat, [...current, { name: text, level: 3 }])
    setSkillDrafts(prev => ({ ...prev, [cat]: '' }))
  }

  const removeSkillFromCategory = (cat: keyof CategorizedSkills, index: number) => {
    const current = catSkills[cat] || []
    updateCategorizedSkills(cat, current.filter((_, i) => i !== index))
  }

  const setSkillLevel = (cat: keyof CategorizedSkills, index: number, level: number) => {
    const current = [...(catSkills[cat] || [])]
    if (current[index]) {
      current[index] = { ...current[index], level }
      updateCategorizedSkills(cat, current)
    }
  }

  // ── Projects Handlers ──
  const addProject = () => {
    const newProj: Project = {
      id: generateId(),
      name: '',
      title: '',
      description: '',
      objectives: '',
      role: '',
      tech: [],
      tags: [],
      githubUrl: '',
      demoUrl: '',
    }
    updateProfile({ projects: [newProj, ...(profile.projects || [])] })
  }

  const updateProject = (id: string, patch: Partial<Project>) => {
    updateProfile({
      projects: (profile.projects || []).map(p => (p.id === id ? { ...p, ...patch } : p)),
    })
  }

  const removeProject = (id: string) => {
    updateProfile({
      projects: (profile.projects || []).filter(p => p.id !== id),
    })
  }

  const moveProject = (index: number, direction: 'up' | 'down') => {
    const projects = [...(profile.projects || [])]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= projects.length) return
    const temp = projects[index]
    projects[index] = projects[target]
    projects[target] = temp
    updateProfile({ projects })
  }

  // ── Education Handlers ──
  const addEducation = () => {
    const newEdu: Education = {
      id: generateId(),
      school: '',
      degree: '',
      department: '',
      gradYear: '',
      cgpa: '',
      coursework: [],
    }
    updateProfile({ education: [newEdu, ...(profile.education || [])] })
  }

  const updateEducation = (id: string, patch: Partial<Education>) => {
    updateProfile({
      education: (profile.education || []).map(e => (e.id === id ? { ...e, ...patch } : e)),
    })
  }

  const removeEducation = (id: string) => {
    updateProfile({
      education: (profile.education || []).filter(e => e.id !== id),
    })
  }

  const moveEducation = (index: number, direction: 'up' | 'down') => {
    const eduList = [...(profile.education || [])]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= eduList.length) return
    const temp = eduList[index]
    eduList[index] = eduList[target]
    eduList[target] = temp
    updateProfile({ education: eduList })
  }

  // ── Achievements Handlers ──
  const addAchievement = () => {
    const newAch: Achievement = {
      id: generateId(),
      type: 'certificate',
      title: '',
      issuer: '',
      year: new Date().getFullYear().toString(),
      link: '',
    }
    updateProfile({ achievements: [newAch, ...(profile.achievements || [])] })
  }

  const updateAchievement = (id: string, patch: Partial<Achievement>) => {
    updateProfile({
      achievements: (profile.achievements || []).map(a => (a.id === id ? { ...a, ...patch } : a)),
    })
  }

  const removeAchievement = (id: string) => {
    updateProfile({
      achievements: (profile.achievements || []).filter(a => a.id !== id),
    })
  }

  const moveAchievement = (index: number, direction: 'up' | 'down') => {
    const list = [...(profile.achievements || [])]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= list.length) return
    const temp = list[index]
    list[index] = list[target]
    list[target] = temp
    updateProfile({ achievements: list })
  }

  // ── Social Links Handlers ──
  const addSocialLink = () => {
    const current = profile.hero?.socials || []
    const newLink: SocialLink = {
      id: generateId(),
      label: 'Portfolio',
      url: '',
    }
    updateProfile({
      hero: {
        ...profile.hero,
        socials: [...current, newLink],
      },
    })
  }

  const updateSocialLink = (id: string, patch: Partial<SocialLink>) => {
    const current = profile.hero?.socials || []
    updateProfile({
      hero: {
        ...profile.hero,
        socials: current.map(s => (s.id === id ? { ...s, ...patch } : s)),
      },
    })
  }

  const removeSocialLink = (id: string) => {
    const current = profile.hero?.socials || []
    updateProfile({
      hero: {
        ...profile.hero,
        socials: current.filter(s => s.id !== id),
      },
    })
  }

  // ── Contact Section Direct Handlers ──
  const contactData = profile.contact || {
    email: profile.email || '',
    phone: profile.phone || '',
    location: profile.location || '',
    linkedin: '',
    github: '',
  }

  const updateContactData = (patch: Partial<typeof contactData>) => {
    const next = { ...contactData, ...patch }
    updateProfile({
      contact: next,
      email: patch.email !== undefined ? patch.email : profile.email,
      phone: patch.phone !== undefined ? patch.phone : profile.phone,
      location: patch.location !== undefined ? patch.location : profile.location,
    })
  }

  // ── Preview Contact Submit ──
  const handlePreviewContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!previewContactName || !previewContactEmail || !previewContactMessage) {
      toast.error('Please fill out all fields.')
      return
    }
    setPreviewContactSending(true)
    try {
      await axios.post('/api/contact', {
        name: previewContactName,
        email: previewContactEmail,
        message: previewContactMessage,
      })
      setPreviewContactSent(true)
      toast.success('Test message sent via /api/contact!')
      setPreviewContactName('')
      setPreviewContactEmail('')
      setPreviewContactMessage('')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit message')
    } finally {
      setPreviewContactSending(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">
      {/* ── Top Header Toolbar (FolioAI UI: Black + Green only) ── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 gap-3 z-30">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="w-px h-4 bg-[var(--color-border)]" />

          <div className="flex items-center gap-2">
            <Globe size={15} className="text-[var(--color-primary)]" />
            <input
              type="text"
              value={doc.title}
              onChange={e => {
                const updated = { ...doc, title: e.target.value }
                setDocState(updated)
                upsertDocument(updated)
              }}
              className="text-xs sm:text-sm font-bold bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none px-1 text-[var(--color-text)] transition-all"
              placeholder="Portfolio Title"
            />
            {doc.live && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                Live
              </span>
            )}
          </div>
        </div>

        {/* Center: Mobile Tab Switcher */}
        <div className="flex lg:hidden items-center gap-1 p-0.5 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setMobileTab('edit')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              mobileTab === 'edit'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              mobileTab === 'preview'
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-text-muted)]'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Right: Active Palette Pill, Viewport, Publish & View Live */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active Palette Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text)]">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ background: activePalette.accent }}
            />
            <span className="text-xs">{activePalette.name}</span>
          </div>

          {/* Desktop / Mobile Viewport Toggle */}
          <div className="hidden md:flex items-center p-0.5 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              title="Desktop View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'desktop'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              title="Mobile View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'mobile'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              <Smartphone size={14} />
            </button>
          </div>

          {/* Live Link Button */}
          {doc.live && (
            <a
              href={`/p/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-all"
            >
              <ExternalLink size={12} className="text-[var(--color-primary)]" />
              <span>/p/{slug}</span>
            </a>
          )}

          {/* Publish / Unpublish Toggle Button */}
          <button
            type="button"
            onClick={handleTogglePublish}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 ${
              doc.live
                ? 'bg-transparent border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)]'
                : 'bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)]'
            }`}
          >
            {doc.live ? 'Unpublish' : 'Publish Live'}
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Left Editor Pane | Right Preview Pane ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────────
            LEFT PANE: APPEARANCE CARD & 6 COLLAPSIBLE EDITOR SECTIONS
        ───────────────────────────────────────────────────────────────── */}
        <div
          className={`h-full overflow-y-auto border-r border-[var(--color-border)] p-4 sm:p-6 bg-[var(--color-bg)] ${
            mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="max-w-2xl mx-auto flex flex-col gap-5 pb-24">
            {/* ── 1. Appearance Card (Top of Left Pane) ── */}
            <AppearanceCard
              paletteId={paletteId}
              customAccent={customAccent}
              customAccent2={customAccent2}
              jobTitle={profile.headline}
              onChange={handlePaletteChange}
            />

            {/* ── 2. Slug / Public URL Configuration Card ── */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-2">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Portfolio URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--color-text-muted)]">folio.ai/p/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs font-mono text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all"
                  placeholder="your-name"
                />
              </div>
            </div>

            {/* ── 6 Section Cards in sectionOrder ── */}
            {sectionOrder.map((secId, secIdx) => {
              const meta = SECTION_METADATA[secId] || { title: secId, icon: Globe }
              const Icon = meta.icon
              const isEnabled = sections[secId] !== false
              const isOpen = openSections[secId] ?? true

              return (
                <div
                  key={secId}
                  className={`rounded-xl border transition-all ${
                    isEnabled
                      ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                      : 'border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 opacity-60'
                  }`}
                >
                  {/* Card Header with Reordering and Visibility */}
                  <div className="flex items-center justify-between p-3.5 bg-[var(--color-elevated)] rounded-t-xl border-b border-[var(--color-border)] select-none">
                    <div className="flex items-center gap-2.5">
                      {/* Section Reorder Buttons */}
                      <div className="flex items-center gap-0.5 mr-1">
                        <button
                          type="button"
                          disabled={secIdx === 0}
                          onClick={() => moveSectionOrder(secIdx, 'up')}
                          title="Move section up"
                          className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={secIdx === sectionOrder.length - 1}
                          onClick={() => moveSectionOrder(secIdx, 'down')}
                          title="Move section down"
                          className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>

                      <Icon size={16} className="text-[var(--color-primary)]" />
                      <span className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                        {meta.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Section Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleSection(secId)}
                        title={isEnabled ? 'Hide section from portfolio' : 'Show section'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                          isEnabled
                            ? 'bg-[var(--color-primary-subtle)] border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                            : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {isEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{isEnabled ? 'Visible' : 'Hidden'}</span>
                      </button>

                      {/* Expand / Collapse Chevron */}
                      {isEnabled && (
                        <button
                          type="button"
                          onClick={() => setOpenSections(prev => ({ ...prev, [secId]: !isOpen }))}
                          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                        >
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section Content Area */}
                  {isEnabled && isOpen && (
                    <div className="p-4 sm:p-5 flex flex-col gap-5">
                      {/* 1. HERO FORM */}
                      {secId === 'hero' && (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                              Hero Profile Photo (Max 2MB)
                            </label>
                            <div className="flex items-center gap-4">
                              {profile.hero?.photoUrl ? (
                                <div className="relative group">
                                  <img
                                    src={profile.hero.photoUrl}
                                    alt="Hero preview"
                                    className="w-16 h-16 rounded-xl object-cover border-2 border-[var(--color-primary)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateProfile({ hero: { ...profile.hero, photoUrl: '' } })}
                                    title="Remove photo"
                                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-[var(--color-danger)] text-white shadow-sm hover:opacity-90"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-elevated)] flex items-center justify-center text-[var(--color-text-muted)]">
                                  <Upload size={18} />
                                </div>
                              )}

                              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-all">
                                <Upload size={13} />
                                <span>{profile.hero?.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e =>
                                    handleImageUpload(e, url =>
                                      updateProfile({ hero: { ...profile.hero, photoUrl: url } })
                                    )
                                  }
                                />
                              </label>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Hero Tagline
                              </label>
                              <button
                                type="button"
                                disabled={aiLoadingKey === 'tagline'}
                                onClick={() =>
                                  generateAIText('tagline', 'tagline', profile.headline, t =>
                                    updateProfile({ hero: { ...profile.hero, tagline: t } })
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:opacity-85 disabled:opacity-50 transition-all"
                              >
                                <Sparkles size={11} />
                                <span>{aiLoadingKey === 'tagline' ? 'Generating...' : 'AI ✨ Tagline'}</span>
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={profile.hero?.tagline || ''}
                              onChange={e => updateProfile({ hero: { ...profile.hero, tagline: e.target.value } })}
                              placeholder="Full-stack engineer building performant distributed systems..."
                              className="px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-all resize-none"
                            />
                          </div>

                          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Custom Social / External Links
                              </label>
                              <button
                                type="button"
                                onClick={addSocialLink}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                              >
                                <Plus size={13} /> Add Link
                              </button>
                            </div>

                            <div className="flex flex-col gap-2">
                              {(profile.hero?.socials || []).map(s => {
                                const urlValid = isValidUrl(s.url)
                                return (
                                  <div key={s.id} className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={s.label}
                                        onChange={e => updateSocialLink(s.id, { label: e.target.value })}
                                        placeholder="Label (e.g. X, Portfolio)"
                                        className="w-28 sm:w-36 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                      />
                                      <input
                                        type="text"
                                        value={s.url}
                                        onChange={e => updateSocialLink(s.id, { url: e.target.value })}
                                        placeholder="https://..."
                                        className={`flex-1 px-2.5 py-1.5 rounded-lg border bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none transition-all ${
                                          !urlValid
                                            ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                                            : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeSocialLink(s.id)}
                                        className="p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] rounded-lg transition-colors"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                    {!urlValid && (
                                      <span className="text-[10px] text-[var(--color-danger)] pl-1">
                                        Please enter a valid URL.
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. SKILLS FORM */}
                      {secId === 'skills' && (
                        <div className="flex flex-col gap-6">
                          {(
                            [
                              { key: 'technical', label: 'Technical Skills' },
                              { key: 'frameworks', label: 'Frameworks & Libraries' },
                              { key: 'tools', label: 'Tools & Platforms' },
                              { key: 'soft', label: 'Soft & Core Skills' },
                            ] as const
                          ).map(catMeta => {
                            const items = catSkills[catMeta.key] || []
                            return (
                              <div key={catMeta.key} className="flex flex-col gap-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center justify-between">
                                  <span>{catMeta.label}</span>
                                  <span className="text-[10px] font-mono text-[var(--color-primary)]">
                                    {items.length} items
                                  </span>
                                </label>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={skillDrafts[catMeta.key] || ''}
                                    onChange={e =>
                                      setSkillDrafts(prev => ({ ...prev, [catMeta.key]: e.target.value }))
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault()
                                        addSkillToCategory(catMeta.key)
                                      }
                                    }}
                                    placeholder="Type skill & press Enter..."
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addSkillToCategory(catMeta.key)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:opacity-90"
                                  >
                                    Add
                                  </button>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                  {items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)]"
                                    >
                                      <span className="font-medium">{item.name}</span>

                                      <div className="flex items-center gap-1 border-l border-[var(--color-border)] pl-1.5">
                                        {[1, 2, 3, 4, 5].map(lvl => (
                                          <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => setSkillLevel(catMeta.key, idx, lvl)}
                                            title={`Level ${lvl} / 5`}
                                            className="w-2 h-2 rounded-full transition-all"
                                            style={{
                                              background:
                                                lvl <= (item.level || 0)
                                                  ? 'var(--color-primary)'
                                                  : 'var(--color-border)',
                                            }}
                                          />
                                        ))}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => removeSkillFromCategory(catMeta.key, idx)}
                                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors pl-1"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* 3. PROJECTS FORM */}
                      {secId === 'projects' && (
                        <div className="flex flex-col gap-5">
                          <button
                            type="button"
                            onClick={addProject}
                            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[var(--color-primary)]/50 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
                          >
                            <Plus size={14} /> Add New Project
                          </button>

                          {(profile.projects || []).map((proj, idx) => {
                            const githubValid = isValidUrl(proj.githubUrl || '')
                            const demoValid = isValidUrl(proj.demoUrl || '')
                            const pName = proj.name || proj.title || ''

                            return (
                              <div
                                key={proj.id}
                                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col gap-4"
                              >
                                <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                                  <span className="text-xs font-bold text-[var(--color-text)]">
                                    Project #{idx + 1}: {pName || 'Untitled'}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => moveProject(idx, 'up')}
                                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-20"
                                    >
                                      <ArrowUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === (profile.projects || []).length - 1}
                                      onClick={() => moveProject(idx, 'down')}
                                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-20"
                                    >
                                      <ArrowDown size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeProject(proj.id)}
                                      className="p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] rounded"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      Project Name
                                    </label>
                                    <input
                                      type="text"
                                      value={pName}
                                      onChange={e =>
                                        updateProject(proj.id, { name: e.target.value, title: e.target.value })
                                      }
                                      placeholder="e.g. Distributed Task Queue"
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                        My Role
                                      </label>
                                      <button
                                        type="button"
                                        disabled={aiLoadingKey === `role-${proj.id}`}
                                        onClick={() =>
                                          generateAIText(`role-${proj.id}`, 'role', pName, r =>
                                            updateProject(proj.id, { role: r })
                                          )
                                        }
                                        className="text-[10px] text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                                      >
                                        <Sparkles size={10} /> AI Role
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={proj.role || ''}
                                      onChange={e => updateProject(proj.id, { role: e.target.value })}
                                      placeholder="e.g. Lead Frontend Engineer"
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Project Thumbnail (Max 2MB)
                                  </label>
                                  <div className="flex items-center gap-3">
                                    {proj.thumbnail ? (
                                      <div className="relative group">
                                        <img
                                          src={proj.thumbnail}
                                          alt={pName}
                                          className="w-16 h-12 rounded-lg object-cover border border-[var(--color-border)]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => updateProject(proj.id, { thumbnail: '' })}
                                          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-[var(--color-danger)] text-white shadow-sm"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="w-16 h-12 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)]">
                                        <Upload size={14} />
                                      </div>
                                    )}

                                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-all">
                                      <Upload size={12} />
                                      <span>{proj.thumbnail ? 'Change Image' : 'Upload Image'}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e =>
                                          handleImageUpload(e, url => updateProject(proj.id, { thumbnail: url }))
                                        }
                                      />
                                    </label>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      Description
                                    </label>
                                    <button
                                      type="button"
                                      disabled={aiLoadingKey === `desc-${proj.id}`}
                                      onClick={() =>
                                        generateAIText(`desc-${proj.id}`, 'project', pName, desc =>
                                          updateProject(proj.id, { description: desc })
                                        )
                                      }
                                      className="text-[10px] text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                                    >
                                      <Sparkles size={10} /> AI Description
                                    </button>
                                  </div>
                                  <textarea
                                    rows={2}
                                    value={proj.description}
                                    onChange={e => updateProject(proj.id, { description: e.target.value })}
                                    placeholder="Engineered high-throughput event processing pipeline..."
                                    className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] resize-y"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Objectives & Key Impact
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={proj.objectives || ''}
                                    onChange={e => updateProject(proj.id, { objectives: e.target.value })}
                                    placeholder="Reduced latency by 45% and scaled to handle 10k concurrent requests..."
                                    className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] resize-y"
                                  />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Technologies Used (Press Enter to add chip)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={techDrafts[proj.id] || ''}
                                      onChange={e =>
                                        setTechDrafts(prev => ({ ...prev, [proj.id]: e.target.value }))
                                      }
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                          e.preventDefault()
                                          const val = (techDrafts[proj.id] || '').trim()
                                          if (!val) return
                                          const current = proj.tech && proj.tech.length > 0 ? proj.tech : (proj.tags || [])
                                          if (!current.includes(val)) {
                                            const updated = [...current, val]
                                            updateProject(proj.id, { tech: updated, tags: updated })
                                          }
                                          setTechDrafts(prev => ({ ...prev, [proj.id]: '' }))
                                        }
                                      }}
                                      placeholder="e.g. Next.js, Redis, Docker..."
                                      className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {(proj.tech && proj.tech.length > 0 ? proj.tech : (proj.tags || [])).map(
                                      (t, tIdx) => (
                                        <span
                                          key={tIdx}
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] text-[var(--color-text)]"
                                        >
                                          <span>{t}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = proj.tech || proj.tags || []
                                              const updated = current.filter((_, i) => i !== tIdx)
                                              updateProject(proj.id, { tech: updated, tags: updated })
                                            }}
                                            className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      GitHub Repository URL
                                    </label>
                                    <input
                                      type="text"
                                      value={proj.githubUrl || ''}
                                      onChange={e => updateProject(proj.id, { githubUrl: e.target.value })}
                                      placeholder="https://github.com/..."
                                      className={`px-3 py-1.5 rounded-lg border bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none transition-all ${
                                        !githubValid
                                          ? 'border-[var(--color-danger)]'
                                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                                      }`}
                                    />
                                    {!githubValid && (
                                      <span className="text-[10px] text-[var(--color-danger)]">
                                        Please enter a valid URL.
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      Live Demo URL
                                    </label>
                                    <input
                                      type="text"
                                      value={proj.demoUrl || proj.url || ''}
                                      onChange={e =>
                                        updateProject(proj.id, { demoUrl: e.target.value, url: e.target.value })
                                      }
                                      placeholder="https://..."
                                      className={`px-3 py-1.5 rounded-lg border bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none transition-all ${
                                        !demoValid
                                          ? 'border-[var(--color-danger)]'
                                          : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                                      }`}
                                    />
                                    {!demoValid && (
                                      <span className="text-[10px] text-[var(--color-danger)]">
                                        Please enter a valid URL.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* 4. EDUCATION FORM */}
                      {secId === 'education' && (
                        <div className="flex flex-col gap-5">
                          <button
                            type="button"
                            onClick={addEducation}
                            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[var(--color-primary)]/50 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
                          >
                            <Plus size={14} /> Add Education Record
                          </button>

                          {(profile.education || []).map((edu, idx) => (
                            <div
                              key={edu.id}
                              className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col gap-3.5"
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                                <span className="text-xs font-bold text-[var(--color-text)]">
                                  #{idx + 1}: {edu.school || edu.institution || 'School'}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveEducation(idx, 'up')}
                                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-20"
                                  >
                                    <ArrowUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === (profile.education || []).length - 1}
                                    onClick={() => moveEducation(idx, 'down')}
                                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-20"
                                  >
                                    <ArrowDown size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeEducation(edu.id)}
                                    className="p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] rounded"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Degree
                                  </label>
                                  <input
                                    type="text"
                                    value={edu.degree}
                                    onChange={e => updateEducation(edu.id, { degree: e.target.value })}
                                    placeholder="e.g. B.S. in Computer Science"
                                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Institution / School
                                  </label>
                                  <input
                                    type="text"
                                    value={edu.school || edu.institution || ''}
                                    onChange={e =>
                                      updateEducation(edu.id, { school: e.target.value, institution: e.target.value })
                                    }
                                    placeholder="e.g. Stanford University"
                                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Department / Major
                                  </label>
                                  <input
                                    type="text"
                                    value={edu.department || edu.field || ''}
                                    onChange={e =>
                                      updateEducation(edu.id, { department: e.target.value, field: e.target.value })
                                    }
                                    placeholder="Engineering"
                                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Graduation Year
                                  </label>
                                  <input
                                    type="text"
                                    value={edu.gradYear || edu.end || ''}
                                    onChange={e =>
                                      updateEducation(edu.id, { gradYear: e.target.value, end: e.target.value })
                                    }
                                    placeholder="2024"
                                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    GPA / Honors (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={edu.cgpa || ''}
                                    onChange={e => updateEducation(edu.id, { cgpa: e.target.value })}
                                    placeholder="3.9 / 4.0"
                                    className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5 pt-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                  Key Coursework (Press Enter to add)
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={courseworkDrafts[edu.id] || ''}
                                    onChange={e =>
                                      setCourseworkDrafts(prev => ({ ...prev, [edu.id]: e.target.value }))
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault()
                                        const val = (courseworkDrafts[edu.id] || '').trim()
                                        if (!val) return
                                        const current = edu.coursework || []
                                        if (!current.includes(val)) {
                                          updateEducation(edu.id, { coursework: [...current, val] })
                                        }
                                        setCourseworkDrafts(prev => ({ ...prev, [edu.id]: '' }))
                                      }
                                    }}
                                    placeholder="e.g. Distributed Systems, Algorithms..."
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {(edu.coursework || []).map((c, cIdx) => (
                                    <span
                                      key={cIdx}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] text-[var(--color-text)]"
                                    >
                                      <span>{c}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = edu.coursework || []
                                          updateEducation(edu.id, {
                                            coursework: current.filter((_, i) => i !== cIdx),
                                          })
                                        }}
                                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 5. ACHIEVEMENTS & CERTIFICATIONS FORM */}
                      {secId === 'achievements' && (
                        <div className="flex flex-col gap-5">
                          <button
                            type="button"
                            onClick={addAchievement}
                            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[var(--color-primary)]/50 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
                          >
                            <Plus size={14} /> Add Achievement or Certificate
                          </button>

                          {(profile.achievements || []).map((ach, idx) => {
                            const linkValid = isValidUrl(ach.link || '')

                            return (
                              <div
                                key={ach.id}
                                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] flex flex-col gap-3"
                              >
                                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                                  <span className="text-xs font-bold text-[var(--color-text)]">
                                    #{idx + 1}: {ach.title || 'Untitled Achievement'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => moveAchievement(idx, 'up')}
                                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-20"
                                    >
                                      <ArrowUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === (profile.achievements || []).length - 1}
                                      onClick={() => moveAchievement(idx, 'down')}
                                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-20"
                                    >
                                      <ArrowDown size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeAchievement(ach.id)}
                                      className="p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] rounded"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      Type
                                    </label>
                                    <select
                                      value={ach.type}
                                      onChange={e =>
                                        updateAchievement(ach.id, { type: e.target.value as AchievementType })
                                      }
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    >
                                      {ACHIEVEMENT_TYPES.map(t => (
                                        <option key={t} value={t}>
                                          {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      Title / Certification Name
                                    </label>
                                    <input
                                      type="text"
                                      value={ach.title}
                                      onChange={e => updateAchievement(ach.id, { title: e.target.value })}
                                      placeholder="e.g. AWS Certified Solutions Architect"
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      Issuing Organization / Host
                                    </label>
                                    <input
                                      type="text"
                                      value={ach.issuer}
                                      onChange={e => updateAchievement(ach.id, { issuer: e.target.value })}
                                      placeholder="e.g. Amazon Web Services"
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                      Year
                                    </label>
                                    <input
                                      type="text"
                                      value={ach.year}
                                      onChange={e => updateAchievement(ach.id, { year: e.target.value })}
                                      placeholder="2024"
                                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Credential URL (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={ach.link || ''}
                                    onChange={e => updateAchievement(ach.id, { link: e.target.value })}
                                    placeholder="https://..."
                                    className={`px-3 py-1.5 rounded-lg border bg-[var(--color-surface)] text-xs text-[var(--color-text)] outline-none transition-all ${
                                      !linkValid
                                        ? 'border-[var(--color-danger)]'
                                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                                    }`}
                                  />
                                  {!linkValid && (
                                    <span className="text-[10px] text-[var(--color-danger)]">
                                      Please enter a valid URL.
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* 6. CONTACT FORM */}
                      {secId === 'contact' && (
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Primary Email
                              </label>
                              <input
                                type="email"
                                value={contactData.email}
                                onChange={e => updateContactData({ email: e.target.value })}
                                placeholder="you@domain.com"
                                className={`px-3 py-1.5 rounded-lg border bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none transition-all ${
                                  !isValidEmail(contactData.email)
                                    ? 'border-[var(--color-danger)]'
                                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                                }`}
                              />
                              {!isValidEmail(contactData.email) && (
                                <span className="text-[10px] text-[var(--color-danger)]">
                                  Please enter a valid email address.
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                Phone Number (Optional)
                              </label>
                              <input
                                type="text"
                                value={contactData.phone || ''}
                                onChange={e => updateContactData({ phone: e.target.value })}
                                placeholder="+1 (555) 000-0000"
                                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                              Location (Optional)
                            </label>
                            <input
                              type="text"
                              value={contactData.location || ''}
                              onChange={e => updateContactData({ location: e.target.value })}
                              placeholder="San Francisco, CA"
                              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                LinkedIn Profile
                              </label>
                              <input
                                type="text"
                                value={contactData.linkedin || ''}
                                onChange={e => updateContactData({ linkedin: e.target.value })}
                                placeholder="linkedin.com/in/username"
                                className={`px-3 py-1.5 rounded-lg border bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none transition-all ${
                                  !isValidUrl(contactData.linkedin || '')
                                    ? 'border-[var(--color-danger)]'
                                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                                }`}
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                GitHub Profile
                              </label>
                              <input
                                type="text"
                                value={contactData.github || ''}
                                onChange={e => updateContactData({ github: e.target.value })}
                                placeholder="github.com/username"
                                className={`px-3 py-1.5 rounded-lg border bg-[var(--color-elevated)] text-xs text-[var(--color-text)] outline-none transition-all ${
                                  !isValidUrl(contactData.github || '')
                                    ? 'border-[var(--color-danger)]'
                                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            RIGHT PANE: LIVE INTERACTIVE PREVIEW
            (Driven dynamically by CSS variables: --bg, --surface, --text, --muted, --accent, --accent2, --accent-tint, --on-accent)
        ───────────────────────────────────────────────────────────────── */}
        <div
          id="portfolio-preview-pane"
          className={`h-full overflow-y-auto p-4 sm:p-6 flex items-start justify-center transition-colors ${
            mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'
          }`}
          style={{
            ...activePalette.cssVariables,
            background: 'var(--bg)',
          }}
        >
          <div
            className={`w-full transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border ${
              viewMode === 'mobile' ? 'max-w-[390px] min-h-[780px]' : 'max-w-4xl'
            }`}
            style={{
              background: 'var(--bg)',
              borderColor: 'var(--surface)',
              color: 'var(--text)',
            }}
          >
            {/* Sticky Navigation Inside Preview */}
            <div
              className="sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between"
              style={{
                background: 'var(--bg)',
                borderColor: 'var(--surface)',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black"
                  style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  {(profile.name || 'P')[0]?.toUpperCase()}
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                  {profile.name || 'Portfolio'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {sectionOrder.map(secId => {
                  if (sections[secId] === false) return null
                  const label = secId === 'hero' ? 'Home' : secId.charAt(0).toUpperCase() + secId.slice(1)
                  return (
                    <a
                      key={secId}
                      href={`#preview-${secId}`}
                      className="text-[11px] font-medium hidden sm:inline hover:underline"
                      style={{ color: 'var(--muted)' }}
                    >
                      {label}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Preview Sections */}
            <div className="p-6 sm:p-10 flex flex-col gap-16">
              {sectionOrder.map(secId => {
                if (sections[secId] === false) return null

                switch (secId) {
                  case 'hero':
                    return (
                      <div
                        key="hero"
                        id="preview-hero"
                        className="flex flex-col sm:flex-row items-center sm:items-start gap-6"
                      >
                        {profile.hero?.photoUrl ? (
                          <img
                            src={profile.hero.photoUrl}
                            alt="Avatar"
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 shrink-0 shadow-md"
                            style={{ borderColor: 'var(--accent)' }}
                          />
                        ) : (
                          <div
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0 shadow-md"
                            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                          >
                            {(profile.name || 'P')[0]?.toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 text-center sm:text-left flex flex-col items-center sm:items-start">
                          <h1
                            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                            style={{ color: 'var(--text)' }}
                          >
                            {profile.name || 'Your Name'}
                          </h1>
                          <p
                            className="text-sm sm:text-base font-semibold mt-1"
                            style={{ color: 'var(--accent)' }}
                          >
                            {profile.headline || 'Full Stack Software Engineer'}
                          </p>

                          {profile.hero?.tagline && (
                            <p
                              className="text-xs sm:text-sm mt-3 leading-relaxed max-w-xl font-normal"
                              style={{ color: 'var(--muted)' }}
                            >
                              {profile.hero.tagline}
                            </p>
                          )}

                          {/* Action Buttons: Accent + on-accent */}
                          <div className="flex flex-wrap gap-3 mt-5">
                            {sections.projects !== false && (profile.projects || []).length > 0 && (
                              <a
                                href="#preview-projects"
                                className="px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                              >
                                View Projects
                              </a>
                            )}
                            {sections.contact !== false && (
                              <a
                                href="#preview-contact"
                                className="px-4 py-2 rounded-xl text-xs font-bold border active:scale-95 transition-all"
                                style={{
                                  borderColor: 'var(--surface)',
                                  background: 'var(--surface)',
                                  color: 'var(--text)',
                                }}
                              >
                                Contact Me
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )

                  case 'skills': {
                    const skillCategories = [
                      { id: 'technical', label: 'Technical Skills', items: catSkills.technical },
                      { id: 'frameworks', label: 'Frameworks & Libraries', items: catSkills.frameworks },
                      { id: 'tools', label: 'Developer Tools', items: catSkills.tools },
                      { id: 'soft', label: 'Soft Skills', items: catSkills.soft },
                    ].filter(c => c.items.length > 0)

                    if (skillCategories.length === 0) return null

                    return (
                      <div key="skills" id="preview-skills">
                        <span
                          className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Skills
                        </span>
                        <h2 className="text-xl font-bold tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                          Expertise & Stack
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {skillCategories.map(cat => (
                            <div
                              key={cat.id}
                              className="p-4 rounded-xl border flex flex-col gap-2.5"
                              style={{
                                background: 'var(--surface)',
                                borderColor: 'rgba(255,255,255,0.06)',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                                  {cat.label}
                                </span>
                                <span
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                                  style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
                                >
                                  {cat.items.length}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {cat.items.map((it, i) => (
                                  <div
                                    key={i}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border"
                                    style={{
                                      background: 'var(--bg)',
                                      borderColor: 'rgba(255,255,255,0.08)',
                                      color: 'var(--text)',
                                    }}
                                  >
                                    <span>{it.name}</span>
                                    {it.level && it.level > 0 && (
                                      <div
                                        className="flex items-center gap-0.5 pl-1 border-l"
                                        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                                      >
                                        {[1, 2, 3, 4, 5].map(d => (
                                          <span
                                            key={d}
                                            className="w-1.5 h-1.5 rounded-full transition-colors"
                                            style={{
                                              background:
                                                d <= (it.level || 0) ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
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
                      </div>
                    )
                  }

                  case 'projects': {
                    const projects = profile.projects || []
                    if (projects.length === 0) return null

                    return (
                      <div key="projects" id="preview-projects">
                        <span
                          className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Showcase
                        </span>
                        <h2 className="text-xl font-bold tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                          Projects
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {projects.map(proj => {
                            const pName = proj.name || proj.title || 'Project'
                            const pTech = proj.tech && proj.tech.length > 0 ? proj.tech : (proj.tags || [])

                            return (
                              <div
                                key={proj.id}
                                className="rounded-xl border overflow-hidden flex flex-col"
                                style={{
                                  background: 'var(--surface)',
                                  borderColor: 'rgba(255,255,255,0.06)',
                                }}
                              >
                                {proj.thumbnail && (
                                  <img
                                    src={proj.thumbnail}
                                    alt={pName}
                                    className="w-full h-36 object-cover border-b"
                                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                                  />
                                )}
                                <div className="p-4 flex-1 flex flex-col">
                                  <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                                    {pName}
                                  </h3>
                                  {proj.role && (
                                    <p className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                                      {proj.role}
                                    </p>
                                  )}
                                  {proj.description && (
                                    <p
                                      className="text-xs mt-2 leading-relaxed"
                                      style={{ color: 'var(--muted)' }}
                                    >
                                      {proj.description}
                                    </p>
                                  )}

                                  {pTech.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3 pt-2">
                                      {pTech.map((t, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[10px] font-mono px-2 py-0.5 rounded"
                                          style={{
                                            background: 'var(--accent-tint)',
                                            color: 'var(--accent)',
                                          }}
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {(proj.githubUrl || proj.demoUrl) && (
                                    <div
                                      className="flex items-center gap-2 mt-4 pt-3 border-t text-xs font-semibold"
                                      style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                                    >
                                      {proj.githubUrl && (
                                        <a
                                          href={proj.githubUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="hover:underline flex items-center gap-1"
                                          style={{ color: 'var(--text)' }}
                                        >
                                          <Github size={12} /> Code
                                        </a>
                                      )}
                                      {proj.demoUrl && (
                                        <a
                                          href={proj.demoUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="ml-auto hover:underline flex items-center gap-1"
                                          style={{ color: 'var(--accent)' }}
                                        >
                                          <ExternalLink size={12} /> Live Demo
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  case 'education': {
                    const education = profile.education || []
                    if (education.length === 0) return null

                    return (
                      <div key="education" id="preview-education">
                        <span
                          className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Academics
                        </span>
                        <h2 className="text-xl font-bold tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                          Education
                        </h2>

                        <div className="flex flex-col gap-3">
                          {education.map(edu => (
                            <div
                              key={edu.id}
                              className="p-4 rounded-xl border flex flex-col gap-1"
                              style={{
                                background: 'var(--surface)',
                                borderColor: 'rgba(255,255,255,0.06)',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                                  {edu.degree}
                                </span>
                                <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                                  {edu.gradYear || edu.end}
                                </span>
                              </div>
                              <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                                {edu.school || edu.institution}{' '}
                                {edu.department ? `· ${edu.department}` : ''}
                              </p>
                              {edu.cgpa && (
                                <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--muted)' }}>
                                  GPA: {edu.cgpa}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  case 'achievements': {
                    const achievements = profile.achievements || []
                    if (achievements.length === 0) return null

                    return (
                      <div key="achievements" id="preview-achievements">
                        <span
                          className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Recognition
                        </span>
                        <h2 className="text-xl font-bold tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                          Certifications & Awards
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {achievements.map(ach => (
                            <div
                              key={ach.id}
                              className="p-4 rounded-xl border flex flex-col gap-1"
                              style={{
                                background: 'var(--surface)',
                                borderColor: 'rgba(255,255,255,0.06)',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded"
                                  style={{
                                    background: 'var(--accent-tint)',
                                    color: 'var(--accent)',
                                  }}
                                >
                                  {ach.type}
                                </span>
                                <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                                  {ach.year}
                                </span>
                              </div>
                              <span className="text-xs font-bold mt-1" style={{ color: 'var(--text)' }}>
                                {ach.title}
                              </span>
                              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                                {ach.issuer}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  case 'contact':
                    return (
                      <div key="contact" id="preview-contact">
                        <span
                          className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1"
                          style={{ color: 'var(--accent)' }}
                        >
                          Connect
                        </span>
                        <h2 className="text-xl font-bold tracking-tight mb-4" style={{ color: 'var(--text)' }}>
                          Contact Me
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2.5 text-xs">
                            {contactData.email && (
                              <div className="flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                <Mail size={14} style={{ color: 'var(--accent)' }} />
                                <span>{contactData.email}</span>
                              </div>
                            )}
                            {contactData.location && (
                              <div className="flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                                <MapPin size={14} style={{ color: 'var(--accent)' }} />
                                <span>{contactData.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Preview Contact Form */}
                          <div
                            className="p-4 rounded-xl border flex flex-col gap-2.5"
                            style={{
                              background: 'var(--surface)',
                              borderColor: 'rgba(255,255,255,0.06)',
                            }}
                          >
                            <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                              Send a Message
                            </span>
                            {previewContactSent ? (
                              <div className="py-4 text-center text-xs font-bold" style={{ color: 'var(--accent)' }}>
                                ✓ Message received!
                              </div>
                            ) : (
                              <form onSubmit={handlePreviewContactSubmit} className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  required
                                  value={previewContactName}
                                  onChange={e => setPreviewContactName(e.target.value)}
                                  placeholder="Your Name"
                                  className="px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                                  style={{
                                    background: 'var(--bg)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    color: 'var(--text)',
                                  }}
                                />
                                <input
                                  type="email"
                                  required
                                  value={previewContactEmail}
                                  onChange={e => setPreviewContactEmail(e.target.value)}
                                  placeholder="Your Email"
                                  className="px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                                  style={{
                                    background: 'var(--bg)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    color: 'var(--text)',
                                  }}
                                />
                                <textarea
                                  required
                                  rows={2}
                                  value={previewContactMessage}
                                  onChange={e => setPreviewContactMessage(e.target.value)}
                                  placeholder="Message..."
                                  className="px-2.5 py-1.5 rounded-lg border text-xs outline-none resize-none"
                                  style={{
                                    background: 'var(--bg)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    color: 'var(--text)',
                                  }}
                                />
                                <button
                                  type="submit"
                                  disabled={previewContactSending}
                                  className="py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                                  style={{
                                    background: 'var(--accent)',
                                    color: 'var(--on-accent)',
                                  }}
                                >
                                  {previewContactSending ? 'Sending...' : 'Send Message'}
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </div>
                    )

                  default:
                    return null
                }
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
