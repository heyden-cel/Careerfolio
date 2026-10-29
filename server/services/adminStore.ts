import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  passwordHash: string
  status: 'active' | 'suspended'
  failedLoginAttempts: number
  lockUntil: number | null
  isDefaultPassword: boolean
  createdAt: string
  updatedAt: string
}

export interface ManagedUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  status: 'active' | 'suspended'
  joined: string
  documentsCount: number
  passwordHash?: string
  lastLogin?: string
}

export interface ManagedDocument {
  id: string
  userId: string
  ownerName: string
  ownerEmail: string
  type: 'resume' | 'portfolio'
  title: string
  live: boolean
  slug?: string
  flagged?: boolean
  flagReason?: string
  lastEdited: string
  template?: string
  data?: any
}

export interface AiLog {
  id: string
  userId: string
  userEmail: string
  action: string // 'summary' | 'bullets' | 'project' | 'starter' | 'tailor' | 'tagline' | 'role' | 'suggest_palette'
  timestamp: string
}

export interface AuditLog {
  id: string
  adminId: string
  adminName: string
  action: string
  details: string
  timestamp: string
  ip: string
}

export interface AdminSettings {
  siteName: string
  allowSignups: boolean
  maintenanceMode: boolean
  defaultPalette: string
  dailyAiLimit: number
}

// ── Global Store In-Memory State ──────────────────────────────────────────────
class StoreState {
  adminUser: AdminUser
  users: Map<string, ManagedUser> = new Map()
  documents: Map<string, ManagedDocument> = new Map()
  aiLogs: AiLog[] = []
  auditLogs: AuditLog[] = []
  settings: AdminSettings = {
    siteName: 'FolioAI',
    allowSignups: true,
    maintenanceMode: false,
    defaultPalette: 'midnight-green',
    dailyAiLimit: 50,
  }

  constructor() {
    const adminId = process.env.ADMIN_ID || 'Admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'ADMIN'
    const passwordHash = bcrypt.hashSync(adminPassword, 10)

    this.adminUser = {
      id: adminId,
      name: 'System Admin',
      email: 'admin@folio.ai',
      role: 'admin',
      passwordHash,
      status: 'active',
      failedLoginAttempts: 0,
      lockUntil: null,
      isDefaultPassword: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.seedDemoData()
  }

  private seedDemoData() {
    // Seed Demo Users
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    const demoUsers: ManagedUser[] = [
      {
        id: 'usr_admin',
        name: 'System Admin',
        email: 'admin@folio.ai',
        role: 'admin',
        status: 'active',
        joined: new Date(now - 30 * day).toISOString(),
        documentsCount: 0,
      },
      {
        id: 'usr_1',
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        role: 'user',
        status: 'active',
        joined: new Date(now - 18 * day).toISOString(),
        documentsCount: 3,
        lastLogin: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'usr_2',
        name: 'Sarah Chen',
        email: 'sarah.chen@techcorp.io',
        role: 'user',
        status: 'active',
        joined: new Date(now - 12 * day).toISOString(),
        documentsCount: 2,
        lastLogin: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'usr_3',
        name: 'Marcus Vance',
        email: 'marcus.vance@designlab.co',
        role: 'user',
        status: 'active',
        joined: new Date(now - 8 * day).toISOString(),
        documentsCount: 2,
        lastLogin: new Date(now - 1 * day).toISOString(),
      },
      {
        id: 'usr_4',
        name: 'Elena Rostova',
        email: 'elena.rostova@devmail.com',
        role: 'user',
        status: 'suspended',
        joined: new Date(now - 5 * day).toISOString(),
        documentsCount: 1,
        lastLogin: new Date(now - 4 * day).toISOString(),
      },
      {
        id: 'usr_5',
        name: 'Jordan Lee',
        email: 'jordan.lee@startup.net',
        role: 'user',
        status: 'active',
        joined: new Date(now - 2 * day).toISOString(),
        documentsCount: 1,
        lastLogin: new Date(now - 30 * 60 * 1000).toISOString(),
      },
      {
        id: '1',
        name: 'Demo User',
        email: 'demo@folio.ai',
        role: 'user',
        status: 'active',
        joined: new Date(now - 1 * day).toISOString(),
        documentsCount: 2,
        lastLogin: new Date(now - 10 * 60 * 1000).toISOString(),
      },
    ]

    demoUsers.forEach(u => this.users.set(u.id, u))

    // Seed Demo Documents
    const demoDocs: ManagedDocument[] = [
      {
        id: 'doc_1',
        userId: 'usr_1',
        ownerName: 'Alex Rivera',
        ownerEmail: 'alex.rivera@example.com',
        type: 'resume',
        title: 'Senior Full-Stack Engineer Resume',
        live: true,
        lastEdited: new Date(now - 2 * day).toISOString(),
        template: 'modern',
      },
      {
        id: 'doc_2',
        userId: 'usr_1',
        ownerName: 'Alex Rivera',
        ownerEmail: 'alex.rivera@example.com',
        type: 'portfolio',
        title: 'Alex Rivera Digital Portfolio',
        live: true,
        slug: 'alex-rivera',
        flagged: false,
        lastEdited: new Date(now - 2 * day).toISOString(),
        template: 'minimal',
      },
      {
        id: 'doc_3',
        userId: 'usr_1',
        ownerName: 'Alex Rivera',
        ownerEmail: 'alex.rivera@example.com',
        type: 'resume',
        title: 'Cloud Architect CV (Draft)',
        live: false,
        lastEdited: new Date(now - 4 * day).toISOString(),
        template: 'technical',
      },
      {
        id: 'doc_4',
        userId: 'usr_2',
        ownerName: 'Sarah Chen',
        ownerEmail: 'sarah.chen@techcorp.io',
        type: 'resume',
        title: 'Lead Frontend Specialist',
        live: true,
        lastEdited: new Date(now - 1 * day).toISOString(),
        template: 'executive',
      },
      {
        id: 'doc_5',
        userId: 'usr_2',
        ownerName: 'Sarah Chen',
        ownerEmail: 'sarah.chen@techcorp.io',
        type: 'portfolio',
        title: 'Sarah Chen Design & Engineering',
        live: true,
        slug: 'sarah-chen',
        flagged: false,
        lastEdited: new Date(now - 3 * day).toISOString(),
        template: 'creative',
      },
      {
        id: 'doc_6',
        userId: 'usr_3',
        ownerName: 'Marcus Vance',
        ownerEmail: 'marcus.vance@designlab.co',
        type: 'portfolio',
        title: 'Marcus Vance 3D Showcase',
        live: true,
        slug: 'marcus-designs',
        flagged: true,
        flagReason: 'Reported by user for uncredited third-party imagery',
        lastEdited: new Date(now - 5 * day).toISOString(),
        template: 'visual',
      },
      {
        id: 'doc_7',
        userId: 'usr_5',
        ownerName: 'Jordan Lee',
        ownerEmail: 'jordan.lee@startup.net',
        type: 'resume',
        title: 'Jordan Lee Junior Dev Resume',
        live: false,
        lastEdited: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        template: 'clean',
      },
      {
        id: 'doc_8',
        userId: '1',
        ownerName: 'Demo User',
        ownerEmail: 'demo@folio.ai',
        type: 'resume',
        title: 'Demo Software Engineer Resume',
        live: true,
        lastEdited: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
        template: 'modern',
      },
      {
        id: 'doc_9',
        userId: '1',
        ownerName: 'Demo User',
        ownerEmail: 'demo@folio.ai',
        type: 'portfolio',
        title: 'Demo Portfolio Website',
        live: true,
        slug: 'demo-user',
        flagged: false,
        lastEdited: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
        template: 'minimal',
      },
    ]

    demoDocs.forEach(d => this.documents.set(d.id, d))

    // Seed Demo AI Logs across the last 14 days
    const aiActions = ['summary', 'bullets', 'project', 'starter', 'tailor', 'summary', 'bullets', 'starter']
    const activeUsers = [
      { id: 'usr_1', email: 'alex.rivera@example.com' },
      { id: 'usr_2', email: 'sarah.chen@techcorp.io' },
      { id: 'usr_3', email: 'marcus.vance@designlab.co' },
      { id: 'usr_5', email: 'jordan.lee@startup.net' },
      { id: '1', email: 'demo@folio.ai' },
    ]

    for (let i = 13; i >= 0; i--) {
      const dayTime = now - i * day
      // 5 to 20 logs per day
      const count = i === 0 ? 18 : 6 + ((i * 7) % 15)
      for (let j = 0; j < count; j++) {
        const u = activeUsers[(j + i) % activeUsers.length]
        const action = aiActions[(j * 3 + i) % aiActions.length]
        this.aiLogs.push({
          id: `ai_${i}_${j}`,
          userId: u.id,
          userEmail: u.email,
          action,
          timestamp: new Date(dayTime - (j * 40 * 60 * 1000)).toISOString(),
        })
      }
    }

    // Seed Demo Audit Logs
    this.auditLogs = [
      {
        id: 'aud_1',
        adminId: this.adminUser.id,
        adminName: this.adminUser.name,
        action: 'System Initialization',
        details: 'Admin interface initialized and default administrator account seeded.',
        timestamp: new Date(now - 14 * day).toISOString(),
        ip: '127.0.0.1',
      },
      {
        id: 'aud_2',
        adminId: this.adminUser.id,
        adminName: this.adminUser.name,
        action: 'User Suspended',
        details: 'Suspended user account elena.rostova@devmail.com following security alert.',
        timestamp: new Date(now - 4 * day).toISOString(),
        ip: '192.168.1.10',
      },
      {
        id: 'aud_3',
        adminId: this.adminUser.id,
        adminName: this.adminUser.name,
        action: 'Portfolio Flagged',
        details: 'Flagged portfolio /p/marcus-designs for copyright review.',
        timestamp: new Date(now - 2 * day).toISOString(),
        ip: '192.168.1.10',
      },
      {
        id: 'aud_4',
        adminId: this.adminUser.id,
        adminName: this.adminUser.name,
        action: 'Settings Updated',
        details: 'Updated AI daily request limit to 50 requests/user.',
        timestamp: new Date(now - 1 * day).toISOString(),
        ip: '192.168.1.10',
      },
      {
        id: 'aud_5',
        adminId: this.adminUser.id,
        adminName: this.adminUser.name,
        action: 'Admin Login',
        details: 'Administrator logged into management console.',
        timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
        ip: '127.0.0.1',
      },
    ]
  }
}

export const adminStore = new StoreState()

// ── Auth & Account Helpers ────────────────────────────────────────────────────
export function getAdminUser() {
  return adminStore.adminUser
}

export function recordFailedLogin(): { locked: boolean; lockUntil: number | null; attemptsRemaining: number } {
  const admin = adminStore.adminUser
  admin.failedLoginAttempts += 1

  if (admin.failedLoginAttempts >= 5) {
    admin.lockUntil = Date.now() + 15 * 60 * 1000 // 15 minutes lockout
    return { locked: true, lockUntil: admin.lockUntil, attemptsRemaining: 0 }
  }

  return {
    locked: false,
    lockUntil: null,
    attemptsRemaining: Math.max(0, 5 - admin.failedLoginAttempts),
  }
}

export function resetFailedLogin() {
  const admin = adminStore.adminUser
  admin.failedLoginAttempts = 0
  admin.lockUntil = null
}

export function isAccountLocked(): { locked: boolean; minutesRemaining: number } {
  const admin = adminStore.adminUser
  if (admin.lockUntil && admin.lockUntil > Date.now()) {
    const minutesRemaining = Math.ceil((admin.lockUntil - Date.now()) / (60 * 1000))
    return { locked: true, minutesRemaining }
  }
  if (admin.lockUntil && admin.lockUntil <= Date.now()) {
    // Lock period expired, reset
    admin.lockUntil = null
    admin.failedLoginAttempts = 0
  }
  return { locked: false, minutesRemaining: 0 }
}

export function checkIsDefaultPassword(newPassword?: string): boolean {
  const defaultPw = process.env.ADMIN_PASSWORD || 'ADMIN'
  if (newPassword) {
    return newPassword === defaultPw
  }
  return bcrypt.compareSync(defaultPw, adminStore.adminUser.passwordHash)
}

export function changeAdminPassword(newPassword: string): boolean {
  const admin = adminStore.adminUser
  admin.passwordHash = bcrypt.hashSync(newPassword, 10)
  admin.isDefaultPassword = (newPassword === (process.env.ADMIN_PASSWORD || 'ADMIN'))
  admin.updatedAt = new Date().toISOString()
  return admin.isDefaultPassword
}

// ── Audit Log Helpers ─────────────────────────────────────────────────────────
export function addAuditLog(action: string, details: string, adminId?: string, adminName?: string, ip = '127.0.0.1') {
  const admin = adminStore.adminUser
  const entry: AuditLog = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    adminId: adminId || admin.id,
    adminName: adminName || admin.name,
    action,
    details,
    timestamp: new Date().toISOString(),
    ip,
  }
  adminStore.auditLogs.unshift(entry)
  return entry
}

// ── AI Log Helpers ────────────────────────────────────────────────────────────
export function logAiRequest(action: string, userId = '1', userEmail = 'demo@folio.ai') {
  const log: AiLog = {
    id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    userEmail,
    action,
    timestamp: new Date().toISOString(),
  }
  adminStore.aiLogs.push(log)
  return log
}

export function checkDailyAiLimit(userId: string): { allowed: boolean; count: number; limit: number } {
  const limit = adminStore.settings.dailyAiLimit
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startTime = startOfDay.getTime()

  const count = adminStore.aiLogs.filter(
    l => l.userId === userId && new Date(l.timestamp).getTime() >= startTime
  ).length

  return {
    allowed: count < limit,
    count,
    limit,
  }
}

