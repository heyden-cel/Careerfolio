import { Request, Response, NextFunction } from 'express'

// Simple in-memory session store (replace with real sessions later)
export interface SessionUser {
  id: string
  name: string
  email: string
  role?: 'user' | 'admin'
}

const sessions = new Map<string, SessionUser>()

// Demo user
sessions.set('demo-session', { id: '1', name: 'Demo User', email: 'demo@folio.ai' })

export function getSession(req: Request) {
  const sid = req.headers['x-session-id'] as string | undefined
  return sid ? sessions.get(sid) : null
}

export function createSession(user: SessionUser): string {
  const sid = Math.random().toString(36).slice(2)
  sessions.set(sid, user)
  return sid
}

export function destroySession(sid: string) {
  sessions.delete(sid)
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getSession(req)
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return }
  ;(req as any).user = user
  next()
}
