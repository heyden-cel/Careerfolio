/**
 * ─── Mock Auth Module ────────────────────────────────────────────────────────
 * Backed by localStorage. Swap individual functions for real API calls later.
 *
 * Storage keys:
 *   folio_users   – Record<email, { id, name, email, passwordHash }>
 *   folio_session – { id, name, email } | null
 */

export interface AuthUser {
  id:    string
  name:  string
  email: string
  role?: 'user' | 'admin'
}

// ── tiny deterministic "hash" (not secure — mock only) ──────────────────────
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

// ── Public API ────────────────────────────────────────────────────────────────

export function getUser(): AuthUser | null {
  return readSession()
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  await delay(400) // simulate network
  const users = readUsers()
  const stored = users[email.toLowerCase()]
  if (!stored || stored.passwordHash !== fakeHash(password)) {
    throw new AuthError('invalid_credentials', 'Incorrect email or password.')
  }
  const user: AuthUser = { id: stored.id, name: stored.name, email: stored.email, role: stored.role || 'user' }
  writeSession(user)
  return user
}

export async function signUp(name: string, email: string, password: string): Promise<AuthUser> {
  await delay(400)
  const users = readUsers()
  const key   = email.toLowerCase()
  if (users[key]) throw new AuthError('email_taken', 'An account with that email already exists.')
  // Public signups are strictly granted role 'user'; admin accounts cannot be created publicly
  const user: AuthUser = { id: Math.random().toString(36).slice(2), name, email: key, role: 'user' }
  users[key] = { ...user, passwordHash: fakeHash(password) }
  writeUsers(users)
  writeSession(user)
  return user
}

export async function signOut(): Promise<void> {
  await delay(100)
  writeSession(null)
}

export async function signInWithGoogle(): Promise<AuthUser> {
  await delay(600)
  // Mock — creates/returns a fixed Google demo account
  const email = 'google-user@gmail.com'
  const users = readUsers()
  if (!users[email]) {
    users[email] = { id: 'google-1', name: 'Google User', email, passwordHash: '' }
    writeUsers(users)
  }
  const user: AuthUser = { id: users[email].id, name: users[email].name, email, role: 'user' }
  writeSession(user)
  return user
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export class AuthError extends Error {
  constructor(public code: string, message: string) { super(message) }
}
