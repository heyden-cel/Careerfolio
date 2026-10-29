import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'folio_super_secret_jwt_admin_key_2026'

export interface AdminPayload {
  id: string
  name: string
  email: string
  role: 'admin'
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload
    if (decoded && decoded.role === 'admin') {
      return decoded
    }
    return null
  } catch {
    return null
  }
}

export function signAdminToken(user: { id: string; name: string; email: string; role: 'admin' }): string {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check cookie or Authorization header
  const cookieToken = req.cookies?.['folio_admin_token']
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined

  const token = cookieToken || headerToken

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Admin authentication required' })
    return
  }

  const verified = verifyAdminToken(token)
  if (!verified || verified.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin privilege required' })
    return
  }

  ;(req as any).adminUser = verified
  next()
}

