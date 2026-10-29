import { Router } from 'express'
import { getSession, createSession, destroySession } from '../middleware/session.js'

const router = Router()

router.get('/me', (req, res) => {
  const user = getSession(req)
  if (!user) { res.status(401).json({ user: null }); return }
  res.json({ user })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body
  // Mock auth — accept any email with password "password"
  if (!email || password !== 'password') {
    res.status(401).json({ error: 'Invalid credentials' }); return
  }
  const user = { id: '1', name: email.split('@')[0], email, role: 'user' as const }
  const sid  = createSession(user)
  res.json({ user, sessionId: sid })
})

router.post('/logout', (req, res) => {
  const sid = req.headers['x-session-id'] as string | undefined
  if (sid) destroySession(sid)
  res.json({ ok: true })
})

export default router
