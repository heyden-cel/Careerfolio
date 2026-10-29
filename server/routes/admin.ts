import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import {
  adminStore,
  getAdminUser,
  recordFailedLogin,
  resetFailedLogin,
  isAccountLocked,
  changeAdminPassword,
  addAuditLog,
} from '../services/adminStore.js'
import { requireAdmin, signAdminToken } from '../middleware/adminAuth.js'

const router = Router()

// ── 1. Admin Authentication ───────────────────────────────────────────────────

router.post('/login', (req: Request, res: Response) => {
  const { id, password } = req.body || {}

  // 1. Check account lockout status (5 failed attempts -> 15 min lock)
  const lockStatus = isAccountLocked()
  if (lockStatus.locked) {
    res.status(429).json({
      error: `Too many failed attempts. Form is locked for ${lockStatus.minutesRemaining} minute(s).`,
      locked: true,
      minutesRemaining: lockStatus.minutesRemaining,
    })
    return
  }

  const admin = getAdminUser()
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1'

  // ID must match admin ID (case-insensitive)
  const isIdValid = id && typeof id === 'string' && id.trim().toLowerCase() === admin.id.toLowerCase()
  const isPasswordValid = password && typeof password === 'string' && bcrypt.compareSync(password, admin.passwordHash)

  if (!isIdValid || !isPasswordValid) {
    const attemptResult = recordFailedLogin()
    if (attemptResult.locked) {
      addAuditLog('Login Lockout Triggered', `Admin account locked after 5 failed attempts from IP ${ip}`, admin.id, admin.name, ip)
      res.status(429).json({
        error: 'Too many failed attempts. Form is locked for 15 minutes.',
        locked: true,
        minutesRemaining: 15,
      })
      return
    }

    res.status(401).json({
      error: 'Invalid ID or password',
      attemptsRemaining: attemptResult.attemptsRemaining,
      locked: false,
    })
    return
  }

  // Success: reset failed attempts
  resetFailedLogin()

  const token = signAdminToken({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: 'admin',
  })

  // Set httpOnly session cookie
  res.cookie('folio_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  })

  addAuditLog('Admin Login', `Admin "${admin.id}" successfully signed in`, admin.id, admin.name, ip)

  res.json({
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin',
    },
    token,
    isDefaultPassword: admin.isDefaultPassword,
  })
})

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('folio_admin_token')
  const admin = (req as any).adminUser || getAdminUser()
  addAuditLog('Admin Logout', `Admin "${admin.id || 'Admin'}" signed out`)
  res.json({ ok: true })
})

router.get('/me', requireAdmin, (req: Request, res: Response) => {
  const admin = getAdminUser()
  res.json({
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin',
    },
    isDefaultPassword: admin.isDefaultPassword,
  })
})

router.post('/change-password', requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body || {}
  const admin = getAdminUser()

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' })
    return
  }

  if (!bcrypt.compareSync(currentPassword, admin.passwordHash)) {
    res.status(400).json({ error: 'Current password does not match' })
    return
  }

  if (newPassword.length < 5) {
    res.status(400).json({ error: 'New password must be at least 5 characters long' })
    return
  }

  const isStillDefault = changeAdminPassword(newPassword)
  addAuditLog('Password Changed', 'Administrator updated system account password')

  res.json({
    ok: true,
    message: 'Password updated successfully',
    isDefaultPassword: isStillDefault,
  })
})

// ── 2. Overview Stats & Charts ────────────────────────────────────────────────

router.get('/overview', requireAdmin, (_req: Request, res: Response) => {
  const users = Array.from(adminStore.users.values())
  const docs = Array.from(adminStore.documents.values())
  const aiLogs = adminStore.aiLogs

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayMs = startOfToday.getTime()

  const totalUsers = users.length
  const newThisWeek = users.filter(u => new Date(u.joined).getTime() >= weekAgo).length
  const resumes = docs.filter(d => d.type === 'resume').length
  const portfolios = docs.filter(d => d.type === 'portfolio').length
  const livePortfolios = docs.filter(d => d.type === 'portfolio' && d.live).length
  const aiRequestsToday = aiLogs.filter(l => new Date(l.timestamp).getTime() >= todayMs).length

  // Generate 14-day signups-over-time chart data
  const signupsOverTime: { date: string; label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dayStart = new Date(d)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(d)
    dayEnd.setHours(23, 59, 59, 999)

    const count = users.filter(u => {
      const uTime = new Date(u.joined).getTime()
      return uTime >= dayStart.getTime() && uTime <= dayEnd.getTime()
    }).length

    signupsOverTime.push({ date: dateStr, label, count })
  }

  // Recent activity (audit logs + recent user events)
  const recentActivity = adminStore.auditLogs.slice(0, 8).map(log => ({
    id: log.id,
    type: log.action,
    description: log.details,
    timestamp: log.timestamp,
    user: log.adminName,
  }))

  res.json({
    stats: {
      totalUsers,
      newThisWeek,
      resumes,
      portfolios,
      livePortfolios,
      aiRequestsToday,
    },
    signupsOverTime,
    recentActivity,
  })
})

// ── 3. Users Management ───────────────────────────────────────────────────────

router.get('/users', requireAdmin, (req: Request, res: Response) => {
  const { search = '', role = 'all', status = 'all', sort = 'joined', order = 'desc', page = '1', limit = '10' } = req.query as Record<string, string>

  let list = Array.from(adminStore.users.values())

  // Role filter
  if (role !== 'all') {
    list = list.filter(u => u.role === role)
  }

  // Status filter
  if (status !== 'all') {
    list = list.filter(u => u.status === status)
  }

  // Search filter (name, email)
  if (search.trim()) {
    const s = search.trim().toLowerCase()
    list = list.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
  }

  // Update dynamic document counts
  list.forEach(u => {
    const count = Array.from(adminStore.documents.values()).filter(d => d.userId === u.id || d.ownerEmail === u.email).length
    u.documentsCount = count
  })

  // Sorting
  list.sort((a, b) => {
    let cmp = 0
    if (sort === 'name') cmp = a.name.localeCompare(b.name)
    else if (sort === 'email') cmp = a.email.localeCompare(b.email)
    else if (sort === 'joined') cmp = new Date(a.joined).getTime() - new Date(b.joined).getTime()
    else if (sort === 'documents') cmp = a.documentsCount - b.documentsCount
    else if (sort === 'status') cmp = a.status.localeCompare(b.status)
    return order === 'asc' ? cmp : -cmp
  })

  // Pagination
  const p = Math.max(1, parseInt(page, 10) || 1)
  const lim = Math.max(1, parseInt(limit, 10) || 10)
  const total = list.length
  const totalPages = Math.ceil(total / lim)
  const paginated = list.slice((p - 1) * lim, p * lim)

  res.json({
    users: paginated,
    total,
    page: p,
    totalPages,
  })
})

router.get('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const user = adminStore.users.get(req.params.id)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const userDocs = Array.from(adminStore.documents.values()).filter(d => d.userId === user.id || d.ownerEmail === user.email)
  const userAiRequests = adminStore.aiLogs.filter(l => l.userId === user.id || l.userEmail === user.email)

  res.json({
    user,
    documents: userDocs,
    aiRequestsCount: userAiRequests.length,
  })
})

router.post('/users/:id/suspend', requireAdmin, (req: Request, res: Response) => {
  const user = adminStore.users.get(req.params.id)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  user.status = user.status === 'active' ? 'suspended' : 'active'
  addAuditLog(
    user.status === 'suspended' ? 'User Suspended' : 'User Unsuspended',
    `Account ${user.email} (${user.name}) status changed to ${user.status}`
  )

  res.json({ user, success: true })
})

router.post('/users/:id/reset-password', requireAdmin, (req: Request, res: Response) => {
  const user = adminStore.users.get(req.params.id)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const tempPassword = `Folio${Math.floor(100000 + Math.random() * 900000)}!`
  addAuditLog('Password Reset', `Generated temporary credentials for user ${user.email}`)

  res.json({
    success: true,
    temporaryPassword: tempPassword,
    message: `Temporary password generated for ${user.email}`,
  })
})

router.delete('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const user = adminStore.users.get(req.params.id)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  if (user.role === 'admin') {
    res.status(400).json({ error: 'Root administrator accounts cannot be deleted' })
    return
  }

  adminStore.users.delete(user.id)

  // Remove associated documents
  const docs = Array.from(adminStore.documents.values())
  docs.forEach(d => {
    if (d.userId === user.id || d.ownerEmail === user.email) {
      adminStore.documents.delete(d.id)
    }
  })

  addAuditLog('User Deleted', `Permanently deleted user account ${user.email} and all documents`)

  res.json({ ok: true, success: true })
})

// ── 4. Documents Management ───────────────────────────────────────────────────

router.get('/documents', requireAdmin, (req: Request, res: Response) => {
  const { search = '', type = 'all', status = 'all', page = '1', limit = '10' } = req.query as Record<string, string>

  let list = Array.from(adminStore.documents.values())

  if (type !== 'all') {
    list = list.filter(d => d.type === type)
  }

  if (status === 'live') {
    list = list.filter(d => d.live)
  } else if (status === 'draft') {
    list = list.filter(d => !d.live)
  }

  if (search.trim()) {
    const s = search.trim().toLowerCase()
    list = list.filter(d => d.title.toLowerCase().includes(s) || d.ownerName.toLowerCase().includes(s) || d.ownerEmail.toLowerCase().includes(s))
  }

  list.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime())

  const p = Math.max(1, parseInt(page, 10) || 1)
  const lim = Math.max(1, parseInt(limit, 10) || 10)
  const total = list.length
  const totalPages = Math.ceil(total / lim)
  const paginated = list.slice((p - 1) * lim, p * lim)

  res.json({
    documents: paginated,
    total,
    page: p,
    totalPages,
  })
})

router.post('/documents/:id/unpublish', requireAdmin, (req: Request, res: Response) => {
  const doc = adminStore.documents.get(req.params.id)
  if (!doc) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  doc.live = false
  doc.lastEdited = new Date().toISOString()
  addAuditLog('Document Unpublished', `Unpublished ${doc.type} "${doc.title}" (Owner: ${doc.ownerEmail})`)

  res.json({ document: doc, success: true })
})

router.delete('/documents/:id', requireAdmin, (req: Request, res: Response) => {
  const doc = adminStore.documents.get(req.params.id)
  if (!doc) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  adminStore.documents.delete(doc.id)
  addAuditLog('Document Deleted', `Permanently deleted ${doc.type} "${doc.title}" (Owner: ${doc.ownerEmail})`)

  res.json({ ok: true, success: true })
})

// ── 5. Portfolios Management ──────────────────────────────────────────────────

router.get('/portfolios', requireAdmin, (req: Request, res: Response) => {
  const { search = '', filter = 'all' } = req.query as Record<string, string>

  // Focus on live portfolios
  let list = Array.from(adminStore.documents.values()).filter(d => d.type === 'portfolio' && d.live)

  if (filter === 'flagged') {
    list = list.filter(d => d.flagged)
  } else if (filter === 'clean') {
    list = list.filter(d => !d.flagged)
  }

  if (search.trim()) {
    const s = search.trim().toLowerCase()
    list = list.filter(d =>
      d.title.toLowerCase().includes(s) ||
      (d.slug && d.slug.toLowerCase().includes(s)) ||
      d.ownerName.toLowerCase().includes(s) ||
      d.ownerEmail.toLowerCase().includes(s)
    )
  }

  list.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime())

  res.json({
    portfolios: list,
    total: list.length,
  })
})

router.post('/portfolios/:id/flag', requireAdmin, (req: Request, res: Response) => {
  const doc = adminStore.documents.get(req.params.id)
  if (!doc || doc.type !== 'portfolio') {
    res.status(404).json({ error: 'Portfolio not found' })
    return
  }

  const { flagged, reason } = req.body || {}
  doc.flagged = Boolean(flagged)
  doc.flagReason = flagged ? (reason || 'Flagged for moderation by administrator') : undefined
  doc.lastEdited = new Date().toISOString()

  addAuditLog(
    doc.flagged ? 'Portfolio Flagged' : 'Portfolio Cleared',
    `${doc.flagged ? 'Flagged' : 'Cleared flag on'} portfolio /p/${doc.slug || doc.id}: ${doc.flagReason || 'No violation'}`
  )

  res.json({ portfolio: doc, success: true })
})

router.post('/portfolios/:id/unpublish', requireAdmin, (req: Request, res: Response) => {
  const doc = adminStore.documents.get(req.params.id)
  if (!doc || doc.type !== 'portfolio') {
    res.status(404).json({ error: 'Portfolio not found' })
    return
  }

  doc.live = false
  doc.lastEdited = new Date().toISOString()
  addAuditLog('Portfolio Unpublished', `Unpublished live portfolio /p/${doc.slug || doc.id}`)

  res.json({ portfolio: doc, success: true })
})

// ── 6. AI Usage Analytics ─────────────────────────────────────────────────────

router.get('/ai', requireAdmin, (_req: Request, res: Response) => {
  const logs = adminStore.aiLogs
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  // 1. AI Usage by Day (last 14 days)
  const usageByDay: { date: string; label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dayStart = new Date(d)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(d)
    dayEnd.setHours(23, 59, 59, 999)

    const count = logs.filter(l => {
      const t = new Date(l.timestamp).getTime()
      return t >= dayStart.getTime() && t <= dayEnd.getTime()
    }).length

    usageByDay.push({ date: dateStr, label, count })
  }

  // 2. AI Usage by Action Type (summary, bullets, project, starter, tailor, etc.)
  const actionCounts: Record<string, number> = {
    summary: 0,
    bullets: 0,
    project: 0,
    starter: 0,
    tailor: 0,
    tagline: 0,
    role: 0,
    suggest_palette: 0,
  }

  logs.forEach(l => {
    const act = l.action.toLowerCase()
    if (act.includes('summary')) actionCounts.summary += 1
    else if (act.includes('bullet')) actionCounts.bullets += 1
    else if (act.includes('project')) actionCounts.project += 1
    else if (act.includes('starter')) actionCounts.starter += 1
    else if (act.includes('tailor')) actionCounts.tailor += 1
    else if (act.includes('tagline')) actionCounts.tagline += 1
    else if (act.includes('role')) actionCounts.role += 1
    else if (act.includes('palette')) actionCounts.suggest_palette += 1
    else actionCounts.summary += 1
  })

  const totalActions = Math.max(1, logs.length)
  const usageByAction = Object.entries(actionCounts).map(([action, count]) => ({
    action,
    count,
    percentage: Math.round((count / totalActions) * 100),
  }))

  // 3. Per-user request counts
  const userMap = new Map<string, { userId: string; userEmail: string; count: number; lastAction: string; lastUsed: string }>()
  logs.forEach(l => {
    const key = l.userId || l.userEmail
    const existing = userMap.get(key)
    if (!existing) {
      userMap.set(key, {
        userId: l.userId,
        userEmail: l.userEmail,
        count: 1,
        lastAction: l.action,
        lastUsed: l.timestamp,
      })
    } else {
      existing.count += 1
      if (new Date(l.timestamp).getTime() > new Date(existing.lastUsed).getTime()) {
        existing.lastUsed = l.timestamp
        existing.lastAction = l.action
      }
    }
  })

  const perUserCounts = Array.from(userMap.values()).sort((a, b) => b.count - a.count)

  res.json({
    usageByDay,
    usageByAction,
    perUserCounts,
    dailyLimit: adminStore.settings.dailyAiLimit,
  })
})

router.post('/ai/settings', requireAdmin, (req: Request, res: Response) => {
  const { dailyLimit } = req.body || {}
  const limit = parseInt(dailyLimit, 10)
  if (isNaN(limit) || limit < 1) {
    res.status(400).json({ error: 'Daily limit must be a positive number' })
    return
  }

  adminStore.settings.dailyAiLimit = limit
  addAuditLog('AI Settings Updated', `Configured global AI daily limit to ${limit} requests per user`)

  res.json({
    success: true,
    dailyLimit: adminStore.settings.dailyAiLimit,
  })
})

// ── 7. Settings ───────────────────────────────────────────────────────────────

router.get('/settings', requireAdmin, (_req: Request, res: Response) => {
  const admin = getAdminUser()
  res.json({
    settings: adminStore.settings,
    isDefaultPassword: admin.isDefaultPassword,
  })
})

router.post('/settings', requireAdmin, (req: Request, res: Response) => {
  const { siteName, allowSignups, maintenanceMode, defaultPalette } = req.body || {}

  if (typeof siteName === 'string') adminStore.settings.siteName = siteName.trim()
  if (typeof allowSignups === 'boolean') adminStore.settings.allowSignups = allowSignups
  if (typeof maintenanceMode === 'boolean') adminStore.settings.maintenanceMode = maintenanceMode
  if (typeof defaultPalette === 'string') adminStore.settings.defaultPalette = defaultPalette

  addAuditLog('Settings Updated', `Admin updated site configuration (signups: ${adminStore.settings.allowSignups}, maintenance: ${adminStore.settings.maintenanceMode})`)

  res.json({
    settings: adminStore.settings,
    success: true,
  })
})

// ── 8. Audit Logs ─────────────────────────────────────────────────────────────

router.get('/audit-logs', requireAdmin, (req: Request, res: Response) => {
  const { search = '', page = '1', limit = '15' } = req.query as Record<string, string>

  let list = adminStore.auditLogs

  if (search.trim()) {
    const s = search.trim().toLowerCase()
    list = list.filter(l =>
      l.action.toLowerCase().includes(s) ||
      l.details.toLowerCase().includes(s) ||
      l.adminName.toLowerCase().includes(s) ||
      l.adminId.toLowerCase().includes(s)
    )
  }

  const p = Math.max(1, parseInt(page, 10) || 1)
  const lim = Math.max(1, parseInt(limit, 10) || 15)
  const total = list.length
  const totalPages = Math.ceil(total / lim)
  const paginated = list.slice((p - 1) * lim, p * lim)

  res.json({
    logs: paginated,
    total,
    page: p,
    totalPages,
  })
})

export default router

