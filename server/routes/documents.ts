import { Router } from 'express'
import { requireAuth } from '../middleware/session.js'

const router = Router()
const docsStore: Record<string, unknown[]> = {}

const getUserDocs = (userId: string) => (docsStore[userId] as unknown[] | undefined) ?? []
const setUserDocs = (userId: string, docs: unknown[]) => { docsStore[userId] = docs }

router.get('/', requireAuth, (req, res) => {
  const userId = (req as any).user.id
  res.json(getUserDocs(userId))
})

router.post('/', requireAuth, (req, res) => {
  const userId = (req as any).user.id
  const doc = { ...req.body, id: req.body.id || Math.random().toString(36).slice(2) }
  setUserDocs(userId, [...getUserDocs(userId), doc])
  res.status(201).json(doc)
})

router.put('/:id', requireAuth, (req, res) => {
  const userId = (req as any).user.id
  const docs = getUserDocs(userId).map((d: any) => d.id === req.params.id ? { ...d, ...req.body } : d)
  setUserDocs(userId, docs)
  res.json(docs.find((d: any) => d.id === req.params.id))
})

router.delete('/:id', requireAuth, (req, res) => {
  const userId = (req as any).user.id
  setUserDocs(userId, getUserDocs(userId).filter((d: any) => d.id !== req.params.id))
  res.json({ ok: true })
})

export default router
