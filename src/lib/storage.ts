// ─── Types ────────────────────────────────────────────────────────────────────

export interface Experience {
  id: string
  company: string
  role: string
  start: string
  end: string
  current: boolean
  description: string
}

export interface SkillItem {
  id?: string
  name: string
  level?: number // 1 to 5 (optional)
}

export interface CategorizedSkills {
  technical: SkillItem[]
  frameworks: SkillItem[]
  tools: SkillItem[]
  soft: SkillItem[]
}

export interface SocialLink {
  id: string
  label: string
  url: string
}

export interface HeroData {
  photoUrl?: string
  tagline?: string
  socials: SocialLink[]
}

export interface Project {
  id: string
  name?: string
  title?: string // resume compat
  thumbnail?: string
  description: string
  objectives?: string
  tech?: string[]
  tags?: string[] // resume compat
  role?: string
  githubUrl?: string
  demoUrl?: string
  url?: string // resume compat
}

export interface Education {
  id: string
  school?: string
  institution?: string // resume compat
  degree: string
  department?: string
  field?: string // resume compat
  gradYear?: string
  start?: string
  end?: string // resume compat
  cgpa?: string
  coursework?: string[]
}

export type AchievementType = 'certificate' | 'award' | 'hackathon' | 'workshop' | 'publication'

export interface Achievement {
  id: string
  type: AchievementType
  title: string
  issuer: string
  year: string
  link?: string
}

export interface ContactData {
  email: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
}

export interface Profile {
  id: string
  name: string
  email: string
  avatar: string
  headline: string
  location: string
  website: string
  phone?: string
  summary: string

  // 6 Enhanced Portfolio Sections
  hero: HeroData
  skills: CategorizedSkills | string[]
  projects: Project[]
  education: Education[]
  achievements: Achievement[]
  contact: ContactData

  // Work experience for resume
  experience: Experience[]
}

export interface Document {
  id: string
  type: 'resume' | 'portfolio'
  title: string
  template: string
  live: boolean
  slug: string
  editedAt: string
  sections?: {
    hero?: boolean
    skills?: boolean
    projects?: boolean
    education?: boolean
    achievements?: boolean
    contact?: boolean
    about?: boolean
    experience?: boolean
    [key: string]: boolean | undefined
  }
  sectionOrder?: string[]
  palette?: string
  accent?: string
  accent2?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function getFlatSkills(skills: CategorizedSkills | string[] | undefined): string[] {
  if (!skills) return []
  if (Array.isArray(skills)) {
    return skills.map(s => typeof s === 'string' ? s : (s as any)?.name).filter(Boolean)
  }
  const res: string[] = []
  if (Array.isArray(skills.technical)) res.push(...skills.technical.map(s => s.name))
  if (Array.isArray(skills.frameworks)) res.push(...skills.frameworks.map(s => s.name))
  if (Array.isArray(skills.tools)) res.push(...skills.tools.map(s => s.name))
  if (Array.isArray(skills.soft)) res.push(...skills.soft.map(s => s.name))
  return res.filter(Boolean)
}

export function normalizeSkills(skills: CategorizedSkills | string[] | undefined): CategorizedSkills {
  if (!skills) {
    return { technical: [], frameworks: [], tools: [], soft: [] }
  }
  if (Array.isArray(skills)) {
    return {
      technical: skills.map(s => typeof s === 'string' ? { name: s } : s),
      frameworks: [],
      tools: [],
      soft: [],
    }
  }
  return {
    technical: Array.isArray(skills.technical) ? skills.technical : [],
    frameworks: Array.isArray(skills.frameworks) ? skills.frameworks : [],
    tools: Array.isArray(skills.tools) ? skills.tools : [],
    soft: Array.isArray(skills.soft) ? skills.soft : [],
  }
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: Profile = {
  id: 'me',
  name: '',
  email: '',
  avatar: '',
  headline: '',
  location: '',
  website: '',
  phone: '',
  summary: '',
  hero: {
    photoUrl: '',
    tagline: '',
    socials: [],
  },
  skills: {
    technical: [],
    frameworks: [],
    tools: [],
    soft: [],
  },
  experience: [],
  projects: [],
  education: [],
  achievements: [],
  contact: {
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
  },
}

// ─── Storage adapter (localStorage) ───────────────────────────────────────────

const PROFILE_KEY   = 'folio_profile'
const DOCUMENTS_KEY = 'folio_documents'

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return { ...DEFAULT_PROFILE }
    const parsed = JSON.parse(raw)

    // Normalize skills
    const skills = normalizeSkills(parsed.skills)

    // Normalize projects
    const projects: Project[] = Array.isArray(parsed.projects)
      ? parsed.projects.map((p: any) => ({
          id: p.id || generateId(),
          name: p.name || p.title || 'Untitled Project',
          title: p.title || p.name || 'Untitled Project',
          thumbnail: p.thumbnail || '',
          description: p.description || '',
          objectives: p.objectives || '',
          tech: Array.isArray(p.tech) ? p.tech : (Array.isArray(p.tags) ? p.tags : []),
          tags: Array.isArray(p.tags) ? p.tags : (Array.isArray(p.tech) ? p.tech : []),
          role: p.role || '',
          githubUrl: p.githubUrl || '',
          demoUrl: p.demoUrl || p.url || '',
          url: p.url || p.demoUrl || '',
        }))
      : []

    // Normalize education
    const education: Education[] = Array.isArray(parsed.education)
      ? parsed.education.map((e: any) => ({
          id: e.id || generateId(),
          school: e.school || e.institution || '',
          institution: e.institution || e.school || '',
          degree: e.degree || '',
          department: e.department || e.field || '',
          field: e.field || e.department || '',
          gradYear: e.gradYear || e.end || '',
          start: e.start || '',
          end: e.end || e.gradYear || '',
          cgpa: e.cgpa || '',
          coursework: Array.isArray(e.coursework) ? e.coursework : [],
        }))
      : []

    // Normalize achievements
    const achievements: Achievement[] = Array.isArray(parsed.achievements)
      ? parsed.achievements.map((a: any) => ({
          id: a.id || generateId(),
          type: a.type || 'certificate',
          title: a.title || '',
          issuer: a.issuer || '',
          year: a.year || '',
          link: a.link || '',
        }))
      : []

    // Normalize hero
    const hero: HeroData = {
      photoUrl: parsed.hero?.photoUrl || parsed.avatar || '',
      tagline: parsed.hero?.tagline || parsed.headline || '',
      socials: Array.isArray(parsed.hero?.socials)
        ? parsed.hero.socials.map((s: any) => ({
            id: s.id || generateId(),
            label: s.label || '',
            url: s.url || '',
          }))
        : (parsed.website ? [{ id: generateId(), label: 'Website', url: parsed.website }] : []),
    }

    // Normalize contact
    const contact: ContactData = {
      email: parsed.contact?.email || parsed.email || '',
      phone: parsed.contact?.phone || parsed.phone || '',
      location: parsed.contact?.location || parsed.location || '',
      linkedin: parsed.contact?.linkedin || (parsed.website?.includes('linkedin') ? parsed.website : ''),
      github: parsed.contact?.github || '',
    }

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      hero,
      skills,
      projects,
      education,
      achievements,
      contact,
    }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

export function setProfile(p: Partial<Profile>): Profile {
  const current = getProfile()
  const next: Profile = {
    ...current,
    ...p,
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
  return next
}

export function getDocuments(): Document[] {
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function upsertDocument(doc: Document): Document[] {
  const docs = getDocuments()
  const idx = docs.findIndex(d => d.id === doc.id)
  const next = idx >= 0 ? docs.map((d, i) => i === idx ? doc : d) : [...docs, doc]
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(next))
  return next
}

export function deleteDocument(id: string): Document[] {
  const next = getDocuments().filter(d => d.id !== id)
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(next))
  return next
}
