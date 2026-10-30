import dotenv from 'dotenv'
dotenv.config()

import { Router, Request, Response } from 'express'
import { logAiRequest, checkDailyAiLimit } from '../services/adminStore.js'

const router = Router()

// Helper
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Curated High-Quality Templates (Fallback & Offline) ─────────────────────
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
    const regex = new RegExp(`\\b${kw.replace('.', '\\.')}\\b`, 'i')
    if (regex.test(lower) && !found.includes(kw)) {
      found.push(kw)
    }
  }
  return found
}

// ── AI Provider Caller (Gemini REST v1beta) ────────────────────────────────
interface ProviderResult {
  text: string
  rawStatus: number
  finishReason?: string
  blockReason?: string
  safetyRatings?: any[]
}

export async function callAiProvider(prompt: string, attempt = 1): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
  const model = process.env.AI_MODEL || 'gemini-1.5-flash'

  if (!apiKey || apiKey.trim() === '') {
    const err: any = new Error('AI key missing or invalid')
    err.status = 500
    throw err
  }

  // Request body: confirm prompt text reaches provider by logging length (never content)
  console.log(`[AI Provider] Attempt ${attempt}: sending prompt (${prompt.length} chars) to model "${model}"`)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const payload: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
    },
  }

  // Disable or restrict thinking mode so it does not consume output budget
  if (model.includes('2.0') || model.includes('2.5') || model.includes('thinking')) {
    payload.generationConfig.thinkingConfig = { thinkingBudget: 0 }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const rawStatus = res.status
    const data: any = await res.json().catch(() => ({}))

    console.log(`[AI Provider] Raw response status: ${rawStatus}`)

    if (rawStatus === 401 || rawStatus === 403) {
      const err: any = new Error('AI key missing or invalid')
      err.status = 500
      throw err
    }

    if (rawStatus === 429) {
      const err: any = new Error('Rate limit, try again')
      err.status = 429
      throw err
    }

    if (!res.ok) {
      const errMsg = data.error?.message || `AI provider returned HTTP ${rawStatus}`
      const err: any = new Error(errMsg)
      err.status = rawStatus >= 500 ? 502 : 500
      throw err
    }

    // Safety or empty candidates: handle blocked responses explicitly
    const blockReason = data.promptFeedback?.blockReason
    if (blockReason) {
      console.warn(`[AI Provider] Prompt blocked by safety: ${blockReason}`)
      const err: any = new Error(`AI returned no text: blocked by safety (${blockReason})`)
      err.status = 502
      throw err
    }

    const candidate = data.candidates?.[0]
    if (!candidate) {
      console.warn('[AI Provider] Candidates array is empty')
      if (attempt === 1) {
        console.log('[AI Provider] Retrying once on empty candidate...')
        return callAiProvider(prompt, 2)
      }
      const err: any = new Error('AI returned no text: empty candidates from provider')
      err.status = 502
      throw err
    }

    const finishReason = candidate.finishReason
    const safetyRatings = candidate.safetyRatings
    console.log(`[AI Provider] Finish reason: ${finishReason}, Safety ratings count: ${safetyRatings?.length || 0}`)

    if (finishReason === 'SAFETY') {
      const err: any = new Error(`AI returned no text: blocked by safety (${finishReason})`)
      err.status = 502
      throw err
    }

    // Response parsing: concatenate all parts instead of assuming parts[0]
    const parts = candidate.content?.parts || []
    const text = parts.map((p: any) => p.text || '').join('').trim()

    if (!text) {
      if (attempt === 1) {
        console.log('[AI Provider] Retrying once on empty text...')
        return callAiProvider(prompt, 2)
      }
      const err: any = new Error(`AI returned no text: finish reason was ${finishReason || 'unknown'}`)
      err.status = 502
      throw err
    }

    return {
      text,
      rawStatus,
      finishReason,
      blockReason,
      safetyRatings,
    }
  } catch (err: any) {
    if (attempt === 1 && (!err.status || err.status === 502)) {
      console.log('[AI Provider] Transient error on attempt 1, retrying once...', err.message)
      return callAiProvider(prompt, 2)
    }
    throw err
  }
}

// ── Built-in Fallback Generators ───────────────────────────────────────────
function handleSummary(body: any): string {
  const { role, headline, skills, currentSummary, context } = body
  if (currentSummary && typeof currentSummary === 'string' && currentSummary.trim().length > 15) {
    return 'Results-driven software professional specializing in modern application development and scalable architecture. Experienced in delivering dependable solutions, collaborating with cross-functional teams, and upholding rigorous engineering standards across the entire development lifecycle.'
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
  const { role, existingBullets } = body
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
      'React', 'TypeScript', 'JavaScript', 'Node.js', 'PostgreSQL',
      'REST APIs', 'Git', 'Docker', 'Tailwind CSS', 'HTML/CSS',
    ],
    experience: [
      {
        role: 'Software Engineer',
        company: 'Technology Solutions',
        start: 'Previous',
        end: 'Present',
        current: true,
        description: 'Design and implement full-stack software capabilities across core application services.',
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
        description: 'Interactive web application featuring responsive design, secure authentication, and real-time state management.',
        tags: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS'],
      },
      {
        title: 'Developer Productivity CLI',
        description: 'Command-line developer utility for inspecting project configurations, validating contracts, and automating code linting.',
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

  const matchedKeywords = jd ? extractKeywords(jd) : []
  const topKwStr = matchedKeywords.slice(0, 4).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')

  let summary = ''
  if (matchedKeywords.length > 0) {
    summary = `Results-focused software professional with demonstrated experience aligned with target requirements in ${topKwStr}. Dedicated to building scalable, maintainable systems, writing high-quality code, and collaborating effectively across cross-functional teams to deliver reliable software solutions.`
  } else if (currentSummary) {
    summary = `Adaptable software engineer dedicated to building scalable web applications and resilient systems. Adept at rapid technical onboarding, cross-functional collaboration, and delivering clean, well-tested code aligned with organizational goals.`
  } else {
    summary = 'Dedicated software engineer offering hands-on technical expertise, collaborative problem-solving, and a focus on clean architecture. Eager to contribute to team velocity, system reliability, and long-term engineering excellence.'
  }

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
    bullets = [
      matchedKeywords.length > 0
        ? `Applied industry best practices in ${topKwStr} to design, implement, and maintain scalable software features.`
        : 'Designed and deployed scalable software features while adhering strictly to high coding and architectural standards.',
      'Collaborated closely with cross-functional stakeholders to clarify project requirements, review architectural trade-offs, and deliver dependable software.',
      'Diagnosed and eliminated performance bottlenecks across application services, improving response reliability and user satisfaction.',
      'Authored comprehensive test suites and technical documentation to streamline onboarding and maintain high engineering quality.',
    ]
  }

  return { summary, bullets, matchedKeywords }
}

// ── Unified POST Handler for /api/ai ───────────────────────────────────────
const handleAiRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {}
    const rawAction = (body.action || body.type || 'summary').toString().toLowerCase().trim()
    const action = rawAction === 'tailor' ? 'tailor_to_job' : rawAction
    const requestedFormat = (body.format || (req.headers.accept?.includes('text/plain') ? 'text' : 'json')).toLowerCase()

    const userId = (req as any).user?.id || '1'
    const userEmail = (req as any).user?.email || 'demo@folio.ai'
    const limitCheck = checkDailyAiLimit(userId)
    if (!limitCheck.allowed) {
      res.status(429).json({
        error: 'Rate limit, try again',
        message: `Daily AI request limit of ${limitCheck.limit} reached. Please try again tomorrow.`,
      })
      return
    }

    logAiRequest(action, userId, userEmail)

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
    const useLiveProvider = Boolean(apiKey && apiKey.trim() !== '')

    await delay(150)

    switch (action) {
      case 'summary': {
        let summaryText = ''
        if (useLiveProvider) {
          const role = body.role || body.title || body.headline || 'Software Engineer'
          const prompt = `Write a concise, professional 3-4 sentence resume summary for a ${role}. Focus on engineering impact, scalable architecture, and collaboration without inventing specific employer names, dates, or false metrics.`
          const providerRes = await callAiProvider(prompt)
          summaryText = providerRes.text
        } else {
          summaryText = handleSummary(body)
        }

        if (requestedFormat === 'text') {
          res.type('text/plain').send(summaryText)
          return
        }
        res.json({ action: 'summary', result: summaryText, summary: summaryText })
        return
      }

      case 'bullets': {
        let bulletsArray: string[] = []
        let bulletsText = ''
        if (useLiveProvider) {
          const role = body.role || body.title || 'Software Engineer'
          const prompt = `Generate 4 strong resume bullet points for a ${role}. Each bullet must begin with a strong action verb and highlight engineering rigor, testing, or performance improvements without inventing false companies or dates. Return each bullet point on a new line starting with • `
          const providerRes = await callAiProvider(prompt)
          bulletsText = providerRes.text
          bulletsArray = bulletsText.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
        } else {
          bulletsArray = handleBullets(body)
          bulletsText = bulletsArray.join('\n')
        }

        if (requestedFormat === 'text') {
          res.type('text/plain').send(bulletsText)
          return
        }
        res.json({ action: 'bullets', result: bulletsText, bullets: bulletsArray })
        return
      }

      case 'project': {
        let projectText = ''
        if (useLiveProvider) {
          const title = body.title || 'Portfolio Project'
          const tech = body.tech || body.skills || 'modern web technologies'
          const prompt = `Write an engaging, 2-3 sentence technical description for a software project titled "${title}" built with ${Array.isArray(tech) ? tech.join(', ') : tech}. Emphasize architecture, user experience, and performance.`
          const providerRes = await callAiProvider(prompt)
          projectText = providerRes.text
        } else {
          projectText = handleProject(body)
        }

        if (requestedFormat === 'text') {
          res.type('text/plain').send(projectText)
          return
        }
        res.json({ action: 'project', result: projectText, description: projectText })
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
        res.json({ action: 'starter', result: starter.summary, data: starter, ...starter })
        return
      }

      case 'tailor':
      case 'tailor_to_job': {
        const jd = (body.jobDescription || body.job_description || body.jd || body.prompt || body.text || '').trim()
        let tailoredResult: { summary: string; bullets: string[]; matchedKeywords: string[] }

        if (useLiveProvider && jd) {
          const prompt = `Given this job description: "${jd.slice(0, 1500)}", write:
1. A tailored 3-sentence professional resume summary.
2. Four tailored resume bullet points highlighting relevant skills.
Format as:
SUMMARY: [Summary here]
BULLETS:
• [Bullet 1]
• [Bullet 2]
• [Bullet 3]
• [Bullet 4]`
          const providerRes = await callAiProvider(prompt)
          const raw = providerRes.text
          const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?=BULLETS:|$)/i)
          const bulletsMatch = raw.match(/BULLETS:\s*([\s\S]*?)$/i)
          const parsedSummary = summaryMatch ? summaryMatch[1].trim() : raw.slice(0, 200)
          const parsedBullets = bulletsMatch
            ? bulletsMatch[1].split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
            : ['Demonstrated technical expertise aligned with target role requirements.']

          tailoredResult = {
            summary: parsedSummary,
            bullets: parsedBullets,
            matchedKeywords: extractKeywords(jd),
          }
        } else {
          tailoredResult = handleTailorToJob(body)
        }

        if (requestedFormat === 'text') {
          const text = [
            'TAILORED SUMMARY:',
            tailoredResult.summary,
            '',
            'TAILORED BULLETS:',
            ...tailoredResult.bullets.map(b => `• ${b}`),
          ].join('\n')
          res.type('text/plain').send(text)
          return
        }

        res.json({
          action: 'tailor_to_job',
          result: tailoredResult.summary,
          summary: tailoredResult.summary,
          bullets: tailoredResult.bullets,
          matchedKeywords: tailoredResult.matchedKeywords,
        })
        return
      }

      case 'tagline': {
        const tagline = pick(TAGLINES)
        if (requestedFormat === 'text') {
          res.type('text/plain').send(tagline)
          return
        }
        res.json({ action: 'tagline', result: tagline, tagline })
        return
      }

      case 'role': {
        const roleDesc = pick(ROLE_DESCRIPTIONS)
        if (requestedFormat === 'text') {
          res.type('text/plain').send(roleDesc)
          return
        }
        res.json({ action: 'role', result: roleDesc, role: roleDesc })
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
        res.json({ action: 'suggest_palette', paletteId, result: paletteId })
        return
      }

      default: {
        res.status(400).json({
          error: `Unknown action: "${action}". Valid actions are: summary, bullets, project, starter, tailor, tailor_to_job, tagline, role, suggest_palette`,
        })
        return
      }
    }
  } catch (err: any) {
    console.error('[AI Route Error]:', err.message || err)
    const statusCode = err.status || 500
    res.status(statusCode).json({
      error: err.message || 'Failed to process AI request',
      status: statusCode,
      finishReason: err.finishReason,
      blockReason: err.blockReason,
    })
  }
}

// Support both root POST / and POST /generate
router.post('/', handleAiRequest)
router.post('/generate', handleAiRequest)

export default router
