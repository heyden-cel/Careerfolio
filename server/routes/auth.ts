import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { getSession, createSession, destroySession } from '../middleware/session.js'
import { adminStore, registerNewUser } from '../services/adminStore.js'
import { UserModel } from '../models/User.js'

const router = Router()

const isMongoReady = () => mongoose.connection.readyState === 1

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const user = getSession(req)
  if (!user) {
    res.status(401).json({ user: null })
    return
  }
  res.json({ user })
})

// POST /api/auth/register (also handles /signup)
const handleRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body || {}
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' })
      return
    }

    if (!adminStore.settings.allowSignups) {
      res.status(403).json({ error: 'New user signups are currently disabled by the administrator.' })
      return
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanName = name.trim()

    // Check if user exists in adminStore
    const existingInStore = Array.from(adminStore.users.values()).find(
      u => u.email.toLowerCase() === cleanEmail
    )
    if (existingInStore) {
      res.status(409).json({ error: 'An account with that email already exists.' })
      return
    }

    // Check if user exists in MongoDB Atlas
    if (isMongoReady()) {
      const existingInMongo = await UserModel.findOne({ email: cleanEmail }).lean()
      if (existingInMongo) {
        res.status(409).json({ error: 'An account with that email already exists.' })
        return
      }
    }

    const userId = 'usr_' + Math.random().toString(36).slice(2, 10)
    const passwordHash = bcrypt.hashSync(password, 10)

    // Save to MongoDB Atlas
    if (isMongoReady()) {
      try {
        await UserModel.create({
          id: userId,
          name: cleanName,
          email: cleanEmail,
          role: 'user',
          passwordHash,
          status: 'active',
        })
      } catch (dbErr) {
        console.error('Error saving user to MongoDB:', dbErr)
      }
    }

    // Register in adminStore so Admin Panel immediately sees the new user!
    const managed = registerNewUser(userId, cleanName, cleanEmail, 'user', passwordHash)

    const user = { id: managed.id, name: managed.name, email: managed.email, role: managed.role }
    const sid = createSession(user)
    res.status(201).json({ user, sessionId: sid })
  } catch (err: any) {
    console.error('Registration error:', err)
    res.status(500).json({ error: 'Failed to create account. Please try again.' })
  }
}

router.post('/register', handleRegister)
router.post('/signup', handleRegister)

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' })
      return
    }

    const cleanEmail = email.toLowerCase().trim()

    let matchedUser: any = null

    // 1. Check MongoDB Atlas
    if (isMongoReady()) {
      try {
        matchedUser = await UserModel.findOne({ email: cleanEmail }).lean()
      } catch (err) {
        console.error('Mongo find user error:', err)
      }
    }

    // 2. Check adminStore
    if (!matchedUser) {
      matchedUser = Array.from(adminStore.users.values()).find(
        u => u.email.toLowerCase() === cleanEmail
      )
    }

    // Demo user fallback: password === 'password'
    if (!matchedUser) {
      if (password === 'password') {
        const userId = 'usr_' + Math.random().toString(36).slice(2, 10)
        const name = cleanEmail.split('@')[0]
        const registered = registerNewUser(userId, name, cleanEmail, 'user')
        const user = { id: registered.id, name: registered.name, email: registered.email, role: registered.role }
        const sid = createSession(user)
        res.json({ user, sessionId: sid })
        return
      }
      res.status(401).json({ error: 'Incorrect email or password.' })
      return
    }

    // Check account status
    if (matchedUser.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' })
      return
    }

    // Check password hash
    let isValid = false
    if (matchedUser.passwordHash) {
      isValid = bcrypt.compareSync(password, matchedUser.passwordHash)
    } else if (password === 'password') {
      isValid = true
    }

    if (!isValid) {
      res.status(401).json({ error: 'Incorrect email or password.' })
      return
    }

    // Ensure user is in adminStore
    if (!adminStore.users.has(matchedUser.id)) {
      adminStore.users.set(matchedUser.id, {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role || 'user',
        status: matchedUser.status || 'active',
        joined: matchedUser.joined || new Date().toISOString(),
        documentsCount: 0,
      })
    }

    const user = {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role || 'user',
    }
    const sid = createSession(user)
    res.json({ user, sessionId: sid })
  } catch (err: any) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name = 'Google User', email = 'google-user@gmail.com' } = req.body || {}
    const cleanEmail = email.toLowerCase().trim()

    let userInStore = Array.from(adminStore.users.values()).find(
      u => u.email.toLowerCase() === cleanEmail
    )

    if (!userInStore) {
      const userId = 'usr_google_' + Math.random().toString(36).slice(2, 8)
      if (isMongoReady()) {
        try {
          await UserModel.findOneAndUpdate(
            { email: cleanEmail },
            { id: userId, name, email: cleanEmail, role: 'user', passwordHash: '', status: 'active' },
            { upsert: true, new: true }
          )
        } catch (e) {
          console.error('Error saving Google user to Mongo:', e)
        }
      }
      userInStore = registerNewUser(userId, name, cleanEmail, 'user')
    }

    const user = { id: userInStore.id, name: userInStore.name, email: userInStore.email, role: userInStore.role }
    const sid = createSession(user)
    res.json({ user, sessionId: sid })
  } catch (err: any) {
    console.error('Google auth error:', err)
    res.status(500).json({ error: 'Google sign-in failed' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const sid = req.headers['x-session-id'] as string | undefined
  if (sid) destroySession(sid)
  res.json({ ok: true })
})

export default router
