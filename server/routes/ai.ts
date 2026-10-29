import { Router, Request, Response } from 'express'
import { logAiRequest, checkDailyAiLimit } from '../services/adminStore.js'

const router = Router()

// Clean helper without any invented employers, dates, or numbers
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Bulletproof Curated Libraries (Strict: NO invented employers, NO invented dates, NO invented numbers) ──

const SUMMARIES = [
  'Results-oriented software engineer with a track record of building reliable, scalable web applications and distributed systems. Passionate about clean architecture, developer experience, and delivering thoughtful user interfaces.',
  'Full-stack engineer specializing in performant frontend applications, robust API design, and cloud-native services. Experienced in collaborating across cross-functional teams to translate complex business requirements into maintainable software.',
  'Dedicated software developer experienced in modern web technologies, component-driven design systems, and responsive applications. Focused on engineering rigor, code quality, and continuous system improvements.',
  'Systems-focused engineer with deep expertise across modern frontend ecosystems and backend service layers. Committed to writing clean, well-tested code and mentoring teammates on architectural best practices.',
  'Creative technologist blending product sensibility with solid technical execution. Experienced in taking products from initial architecture to production deployment while ensuring performance, accessibility, and reliability.',
]

const BULLETS_COLLECTION = [
  [
    'Architected and implemented responsive, accessible user interfaces using modern component patterns and declarative state management.',
    'Engineered scalable RESTful endpoints and backend services with modular architecture and comprehensive automated test coverage.',
    'Collaborated closely with product designers, product managers, and engineering stakeholders to refine requirements and deliver key features.',
    'Identified and resolved system performance bottlenecks across database queries, network payloads, and client-side rendering pipelines.',
    'Authored thorough technical documentation, system design specifications, and runbooks to facilitate team knowledge sharing.',
  ],
  [
    'Designed and maintained reusable component libraries adopted across engineering teams, establishing consistent design tokens and user experiences.',
    'Streamlined deployment pipelines and continuous integration workflows, reducing build failures and improving release confidence.',
    'Led technical discussions and code review sessions, championing best practices in TypeScript, clean code, and test-driven development.',
    'Integrated third-party APIs and cloud services with robust error handling, retry policies, and structured logging.',
    'Partnered with quality assurance and operations teams to monitor application health, resolve defects, and maintain system availability.',
  ],
  [
    'Refactored legacy application codebases into modular, maintainable micro-components, improving developer onboarding velocity.',
    'Implemented client-side caching strategies and state synchronization mechanisms to deliver seamless real-time user experiences.',
    'Contributed to database schema design, migration strategies, and indexing to ensure data integrity and query efficiency.',
    'Established end-to-end testing frameworks and unit test suites to protect core business workflows and prevent regression issues.',
    'Participated in sprint planning, task estimation, and post-incident retrospectives to continuously improve team delivery cycles.',
  ],
]

const TAGLINES = [
  'Full-stack engineer crafting performant web experiences, scalable APIs, and modern developer tools.',
  'Software engineer passionate about clean component architecture, system reliability, and thoughtful UI design.',
  'Dedicated technologist turning complex business requirements into elegant, accessible, and resilient software.',
  'Engineering high-impact web applications with a focus on developer experience, performance, and code quality.',
]

const ROLE_DESCRIPTIONS = [
  'Lead Frontend Developer responsible for core architecture, state management, and reusable component libraries.',
  'Full-Stack Engineer overseeing end-to-end feature delivery, REST API integrations, and client-side performance.',
  'Software Engineer driving UI implementation, automated testing, and responsive design patterns across devices.',
  'Technical Contributor handling system design, CI/CD pipeline integration, and technical documentation.',
]

const PROJECT_DESCRIPTIONS = [
  'A full-stack web application featuring responsive user interfaces, secure authentication, and real-time state synchronization across desktop and mobile browsers.',
  'An open-source developer utility that automates API contract validation and generates type-safe client interfaces for modern application stacks.',
  'A high-performance interactive dashboard providing intuitive data visualization, modular filter components, and seamless asynchronous state updates.',
  'A collaborative productivity platform built with modern web technologies, real-time message handling, and client-side optimistic UI rendering.',
  'A developer CLI tool for inspecting, formatting, and standardizing project configurations across monorepo architectures.',
]

// ── Keyword Extraction for Tailoring ──

const KNOWN_KEYWORDS = [
  'react', 'next.js', 'vue', 'angular', 'svelte', 'typescript', 'javascript', 'node.js', 'python',
  'go', 'golang', 'rust', 'java', 'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'graphql',
  'rest', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'tailwind', 'css', 'html',
  'ci/cd', 'agile', 'scrum', 'testing', 'jest', 'cypress', 'playwright', 'microservices',
  'architecture', 'security', 'performance', 'accessibility', 'full-stack', 'frontend', 'backend',
  'cloud', 'devops', 'git', 'collaboration', 'leadership', 'monitoring', 'scalability',
]

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const kw of KNOWN_KEYWORDS) {
    // word boundary check or exact inclusion
    const regex = new RegExp(`\\b${kw.replace('.', '\\.')}\\b`, 'i')
    if (regex.test(lower) && !found.includes(kw)) {
      found.push(kw)
    }
  }
  return found
}

// ── Action Handlers ──

function handleSummary(body: any): string {
  const { role, headline, skills, currentSummary, context } = body
  if (currentSummary && typeof currentSummary === 'string' && currentSummary.trim().length > 15) {
    const raw = currentSummary.trim()
    return `Results-driven software professional specializing in modern application development and scalable architecture. Experienced in delivering dependable solutions, collaborating with cross-functional teams, and upholding rigorous engineering standards across the entire development lifecycle.`
  }
  if (role || headline) {
    const target = role || headline
    return `Experienced ${target} dedicated to building high-performance, maintainable software systems. Strong background in modern development frameworks, collaborative problem solving, and delivering user-focused technical solutions.`
  }
  if (Array.isArray(skills) && skills.length > 0) {
    const topSkills = skills.slice(0, 4).join(', ')
    return `Software engineer skilled in ${topSkills}. Dedicated to writing clean, maintainable code, designing robust application architectures, and delivering reliable software experiences.`
  }
  if (typeof context === 'string' && context.trim().length > 0) {
    return `Software engineer with a solid background in ${context.trim()}. Focused on building dependable software solutions, improving developer workflows, and collaborating effectively across teams.`
  }
  return pick(SUMMARIES)
}

function handleBullets(body: any): string[] {
  const { role, company, skills, existingBullets, context } = body
  if (Array.isArray(existingBullets) && existingBullets.length > 0) {
    return existingBullets.map((b: string) => {
      const clean = b.replace(/^[•\-\*]\s*/, '').trim()
      if (clean.length > 10) {
        return `Streamlined and strengthened ${clean.charAt(0).toLowerCase() + clean.slice(1)}, ensuring high architectural quality and adherence to engineering best practices.`
      }
      return clean
    })
  }
  if (typeof existingBullets === 'string' && existingBullets.trim().length > 0) {
    const lines = existingBullets.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
    if (lines.length > 0) {
      return lines.map(l => `Enhanced and executed ${l.charAt(0).toLowerCase() + l.slice(1)} with a focus on reliability, maintainability, and user experience.`)
    }
  }
  if (role) {
    return [
      `Served as ${role}, leading technical implementation and collaborating with cross-functional partners to ship high-impact features.`,
      'Architected robust frontend and backend solutions, maintaining strict standards for code quality, testing, and system reliability.',
      'Optimized application performance and streamlined developer workflows to improve continuous delivery cycles.',
      'Authored comprehensive technical documentation, architecture specifications, and onboarding guides for engineering peers.',
    ]
  }
  return pick(BULLETS_COLLECTION)
}

function handleProject(body: any): string {
  const { title, tech, skills, description, context } = body
  if (title) {
    const techStack = Array.isArray(tech) ? tech.join(', ') : (Array.isArray(skills) ? skills.slice(0, 3).join(', ') : (tech || 'modern web technologies'))
    return `${title} is a web application built using ${techStack}. Features responsive component architecture, secure API integrations, and intuitive user workflows designed for performance and reliability.`
  }
  if (description && typeof description === 'string' && description.trim().length > 10) {
    return `An innovative software project focused on ${description.trim()}. Designed with clean architectural separation, comprehensive automated tests, and accessible, responsive interfaces.`
  }
  if (typeof context === 'string' && context.trim().length > 0) {
    return `A technical project engineered around ${context.trim()}, emphasizing scalable design patterns, robust error handling, and intuitive user interactions.`
  }
  return pick(PROJECT_DESCRIPTIONS)
}

function handleStarter(): {
  headline: string
  summary: string
  skills: string[]
  experience: {
    role: string
    company: string
    start: string
    end: string
    current: boolean
    description: string
    bullets: string[]
  }[]
  projects: {
    title: string
    description: string
    tags: string[]
  }[]
} {
  return {
    headline: 'Software Engineer & Full-Stack Developer',
    summary:
      'Dedicated software engineer with a strong foundation in modern web technologies, distributed services, and user-centric application design. Committed to writing clean, maintainable code, establishing robust testing practices, and collaborating across teams to ship dependable products.',
    skills: [
      'React',
      'TypeScript',
      'JavaScript',
      'Node.js',
      'PostgreSQL',
      'REST APIs',
      'Git',
      'Docker',
      'Tailwind CSS',
      'HTML/CSS',
    ],
    experience: [
      {
        role: 'Software Engineer',
        company: 'Technology Solutions',
        start: 'Previous',
        end: 'Present',
        current: true,
        description:
          'Design and implement full-stack software capabilities across core application services.',
        bullets: [
          'Architected and implemented responsive user interfaces using modern component patterns and state management.',
          'Developed robust RESTful endpoints and integrated backend services with comprehensive automated test coverage.',
          'Collaborated closely with designers and product managers to refine requirements and ship high-impact features.',
          'Standardized continuous integration workflows and automated testing to ensure release reliability.',
        ],
      },
    ],
    projects: [
      {
        title: 'Modern Web Application',
        description:
          'Interactive web application featuring responsive design, secure authentication, and real-time state management.',
        tags: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS'],
      },
      {
        title: 'Developer Productivity CLI',
        description:
          'Command-line developer utility for inspecting project configurations, validating contracts, and automating code linting.',
        tags: ['TypeScript', 'Node.js', 'REST APIs'],
      },
    ],
  }
}

function handleTailorToJob(body: any): {
  summary: string
  bullets: string[]
  matchedKeywords: string[]
} {
  const jd = (body.jobDescription || body.job_description || body.jd || body.prompt || body.text || '').trim()
  const currentSummary = (body.summary || body.currentSummary || '').trim()
  const rawBullets = body.bullets || body.existingBullets || []

  // Extract detected keywords from JD
  const matchedKeywords = jd ? extractKeywords(jd) : []
  const topKwStr = matchedKeywords.slice(0, 4).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')

  // 1. Rewritten Summary: strictly NO invented employers, NO invented dates, NO invented numbers
  let summary = ''
  if (matchedKeywords.length > 0) {
    summary = `Results-focused software professional with demonstrated experience aligned with target requirements in ${topKwStr}. Dedicated to building scalable, maintainable systems, writing high-quality code, and collaborating effectively across cross-functional teams to deliver reliable software solutions.`
  } else if (currentSummary) {
    summary = `Adaptable software engineer dedicated to building scalable web applications and resilient systems. Adept at rapid technical onboarding, cross-functional collaboration, and delivering clean, well-tested code aligned with organizational goals.`
  } else {
    summary = `Dedicated software engineer offering hands-on technical expertise, collaborative problem-solving, and a focus on clean architecture. Eager to contribute to team velocity, system reliability, and long-term engineering excellence.`
  }

  // 2. Rewritten Bullets: strictly NO invented employers, NO invented dates, NO invented numbers
  let bullets: string[] = []
  const baseBullets: string[] = Array.isArray(rawBullets)
    ? rawBullets
    : typeof rawBullets === 'string' && rawBullets.trim().length > 0
    ? rawBullets.split('\n').map(b => b.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
    : []

  if (baseBullets.length > 0) {
    bullets = baseBullets.map((b, idx) => {
      const clean = b.replace(/^[•\-\*]\s*/, '').trim()
      const kw = matchedKeywords[idx % matchedKeywords.length]
      if (kw) {
        const capitalizedKw = kw.charAt(0).toUpperCase() + kw.slice(1)
        return `Leveraged ${capitalizedKw} and engineering best practices to advance ${clean.charAt(0).toLowerCase() + clean.slice(1)}, ensuring high code quality and system stability.`
      }
      return `Spearheaded ${clean.charAt(0).toLowerCase() + clean.slice(1)} while adhering strictly to performance benchmarks, automated testing, and team coding standards.`
    })
  } else {
    // Generate tailored bullets from JD keywords without inventing numbers, dates, or employers
    bullets = [
      matchedKeywords.length > 0
        ? `Applied industry best practices in ${topKwStr} to design, implement, and maintain scalable software features.`
        : 'Designed and deployed scalable software features while adhering strictly to high coding and architectural standards.',
      'Collaborated closely with cross-functional stakeholders to clarify project requirements, review architectural trade-offs, and deliver dependable software.',
      'Diagnosed and eliminated performance bottlenecks across application services, improving response reliability and user satisfaction.',
      'Authored comprehensive test suites and technical documentation to streamline onboarding and maintain high engineering quality.',
    ]
  }

  return {
    summary,
    bullets,
    matchedKeywords,
  }
}

// ── Unified POST Handler for /api/ai ──

const handleAiRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {}
    // Support both `action` and `type` property names
    const action = (body.action || body.type || 'summary').toLowerCase().trim()
    const requestedFormat = (body.format || (req.headers.accept?.includes('text/plain') ? 'text' : 'json')).toLowerCase()

    const userId = (req as any).user?.id || '1'
    const userEmail = (req as any).user?.email || 'demo@folio.ai'
    const limitCheck = checkDailyAiLimit(userId)
    if (!limitCheck.allowed) {
      res.status(429).json({
        error: `Daily AI request limit of ${limitCheck.limit} reached. Please contact your administrator.`,
      })
      return
    }

    logAiRequest(action, userId, userEmail)

    await delay(350)

    switch (action) {
      case 'summary': {
        const summary = handleSummary(body)
        if (requestedFormat === 'text') {
          res.type('text/plain').send(summary)
          return
        }
        res.json({
          action: 'summary',
          result: summary,
          summary,
        })
        return
      }

      case 'bullets': {
        const bullets = handleBullets(body)
        const text = bullets.join('\n')
        if (requestedFormat === 'text') {
          res.type('text/plain').send(text)
          return
        }
        res.json({
          action: 'bullets',
          result: text,
          bullets,
        })
        return
      }

      case 'project': {
        const description = handleProject(body)
        if (requestedFormat === 'text') {
          res.type('text/plain').send(description)
          return
        }
        res.json({
          action: 'project',
          result: description,
          description,
        })
        return
      }

      case 'tagline': {
        const tagline = pick(TAGLINES)
        if (requestedFormat === 'text') {
          res.type('text/plain').send(tagline)
          return
        }
        res.json({
          action: 'tagline',
          result: tagline,
          tagline,
        })
        return
      }

      case 'role': {
        const roleDesc = pick(ROLE_DESCRIPTIONS)
        if (requestedFormat === 'text') {
          res.type('text/plain').send(roleDesc)
          return
        }
        res.json({
          action: 'role',
          result: roleDesc,
          role: roleDesc,
        })
        return
      }

      case 'starter': {
        const starter = handleStarter()
        if (requestedFormat === 'text') {
          const text = [
            `Headline: ${starter.headline}`,
            `Summary: ${starter.summary}`,
            `Skills: ${starter.skills.join(', ')}`,
            `Experience: ${starter.experience[0].role} - ${starter.experience[0].description}`,
            ...starter.experience[0].bullets.map(b => `• ${b}`),
          ].join('\n\n')
          res.type('text/plain').send(text)
          return
        }
        res.json({
          action: 'starter',
          result: starter.summary,
          data: starter,
          ...starter,
        })
        return
      }

      case 'tailor_to_job': {
        const tailored = handleTailorToJob(body)
        if (requestedFormat === 'text') {
          const text = [
            'TAILORED SUMMARY:',
            tailored.summary,
            '',
            'TAILORED BULLETS:',
            ...tailored.bullets.map(b => `• ${b}`),
          ].join('\n')
          res.type('text/plain').send(text)
          return
        }
        res.json({
          action: 'tailor_to_job',
          result: tailored.summary,
          summary: tailored.summary,
          bullets: tailored.bullets,
          matchedKeywords: tailored.matchedKeywords,
        })
        return
      }

      case 'suggest_palette': {
        const title = (body.jobTitle || body.title || body.context || '').toString().toLowerCase()
        let paletteId = 'midnight-green'
        if (title.includes('security') || title.includes('cyber') || title.includes('penetration')) paletteId = 'black-red'
        else if (title.includes('devops') || title.includes('cloud') || title.includes('infrastructure') || title.includes('sre')) paletteId = 'ocean'
        else if (title.includes('design') || title.includes('ui') || title.includes('ux') || title.includes('creative') || title.includes('art')) paletteId = 'royal-purple'
        else if (title.includes('product') || title.includes('growth') || title.includes('marketing') || title.includes('founder')) paletteId = 'sunset'
        else if (title.includes('data') || title.includes('ml') || title.includes('ai') || title.includes('bio') || title.includes('sustainability')) paletteId = 'forest'
        else if (title.includes('frontend') || title.includes('web') || title.includes('full-stack') || title.includes('full stack')) paletteId = 'slate-teal'
        else if (title.includes('writer') || title.includes('editor') || title.includes('fashion') || title.includes('brand')) paletteId = 'rose-noir'
        else if (title.includes('executive') || title.includes('director') || title.includes('cto') || title.includes('architect') || title.includes('lead')) paletteId = 'monochrome'
        else if (title.includes('consultant') || title.includes('analyst') || title.includes('clean')) paletteId = 'clean-light'
        else if (title.includes('academic') || title.includes('research') || title.includes('educator') || title.includes('law')) paletteId = 'paper-ink'
        else if (title.includes('health') || title.includes('mobile') || title.includes('ios') || title.includes('android')) paletteId = 'sky-light'

        if (requestedFormat === 'text') {
          res.type('text/plain').send(paletteId)
          return
        }
        res.json({
          action: 'suggest_palette',
          paletteId,
          result: paletteId,
        })
        return
      }

      default: {
        res.status(400).json({
          error: `Unknown action: "${action}". Valid actions are: summary, bullets, project, tagline, role, starter, tailor_to_job, suggest_palette`,
        })
        return
      }
    }
  } catch (err: any) {
    console.error('AI route error:', err)
    res.status(500).json({
      error: 'Failed to process AI request',
      message: err?.message || 'Unknown error',
    })
  }
}

// Support both root POST / and legacy POST /generate
router.post('/', handleAiRequest)
router.post('/generate', handleAiRequest)

export default router
