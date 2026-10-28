import { Router } from 'express'
import { requireAuth } from '../middleware/session.js'

const router   = Router()
let profileStore: Record<string, unknown> = {}

router.get('/', requireAuth, (req, res) => {
  res.json(profileStore)
})

router.put('/', requireAuth, (req, res) => {
  profileStore = { ...profileStore, ...req.body }
  res.json(profileStore)
})

export default router
