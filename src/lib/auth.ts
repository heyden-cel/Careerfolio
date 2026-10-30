import axios from 'axios'

export interface AuthUser {
  id:    string
  name:  string
  email: string
  role?: 'user' | 'admin'
}

function fakeHash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h.toString(16)
}

type StoredUser = AuthUser & { passwordHash: string }

function readUsers(): Record<string, StoredUser> {
  try { return JSON.parse(localStorage.getItem('folio_users') || '{}') } catch { return {} }
}

function writeUsers(users: Record<string, StoredUser>) {
  localStorage.setItem('folio_users', JSON.stringify(users))
}

function readSession(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('folio_session') || 'null') } catch { return null }
}

function writeSession(u: AuthUser | null) {
  localStorage.setItem('folio_session', JSON.stringify(u))
}

// ── Public Auth API ──────────────────────────────────────────────────────────

export function getUser(): AuthUser | null {
  return readSession()
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.toLowerCase().trim()
  try {
    const res = await axios.post('/api/auth/login', { email: cleanEmail, password }, { withCredentials: true })
    const user: AuthUser = res.data.user
    const users = readUsers()
    users[cleanEmail] = { ...user, passwordHash: fakeHash(password) }
    writeUsers(users)
    writeSession(user)
    return user
  } catch (err: any) {
    if (err.response?.status === 401) {
      throw new AuthError('invalid_credentials', 'Incorrect email or password.')
    }
    if (err.response?.status === 403) {
      throw new AuthError('account_suspended', err.response?.data?.error || 'Account suspended.')
    }
    // Offline / fallback to local storage
    const users = readUsers()
    const stored = users[cleanEmail]
    if (!stored || stored.passwordHash !== fakeHash(password)) {
      throw new AuthError('invalid_credentials', 'Incorrect email or password.')
    }
    const user: AuthUser = { id: stored.id, name: stored.name, email: stored.email, role: stored.role || 'user' }
    writeSession(user)
    return user
  }
}

export async function signUp(name: string, email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.toLowerCase().trim()
  const cleanName = name.trim()
  try {
    const res = await axios.post('/api/auth/register', { name: cleanName, email: cleanEmail, password }, { withCredentials: true })
    const user: AuthUser = res.data.user
    const users = readUsers()
    users[cleanEmail] = { ...user, passwordHash: fakeHash(password) }
    writeUsers(users)
    writeSession(user)
    return user
  } catch (err: any) {
    if (err.response?.status === 409) {
      throw new AuthError('email_taken', 'An account with that email already exists.')
    }
    if (err.response?.status === 403) {
      throw new AuthError('signups_disabled', err.response?.data?.error || 'Signups are currently disabled.')
    }
    // Offline / fallback
    const users = readUsers()
    if (users[cleanEmail]) throw new AuthError('email_taken', 'An account with that email already exists.')
    const user: AuthUser = { id: 'usr_' + Math.random().toString(36).slice(2, 10), name: cleanName, email: cleanEmail, role: 'user' }
    users[cleanEmail] = { ...user, passwordHash: fakeHash(password) }
    writeUsers(users)
    writeSession(user)
    return user
  }
}

export async function signOut(): Promise<void> {
  try {
    await axios.post('/api/auth/logout', {}, { withCredentials: true })
  } catch {}
  writeSession(null)
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const email = 'google-user@gmail.com'
  const name = 'Google User'
  try {
    const res = await axios.post('/api/auth/google', { name, email }, { withCredentials: true })
    const user: AuthUser = res.data.user
    const users = readUsers()
    users[email] = { ...user, passwordHash: '' }
    writeUsers(users)
    writeSession(user)
    return user
  } catch {
    const users = readUsers()
    if (!users[email]) {
      users[email] = { id: 'usr_google_1', name, email, passwordHash: '' }
      writeUsers(users)
    }
    const user: AuthUser = { id: users[email].id, name: users[email].name, email, role: 'user' }
    writeSession(user)
    return user
  }
}

export class AuthError extends Error {
  constructor(public code: string, message: string) { super(message) }
}
