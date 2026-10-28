import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/session.js'
import { ProfileModel } from '../models/Profile.js'

const router = Router()
const profileStore: Record<string, any> = {}

const isMongoReady = () => mongoose.connection.readyState === 1

router.get('/', requireAuth, async (req, res) => {
  const userId = (req as any).user.id
  if (isMongoReady()) {
    try {
      const profile = await ProfileModel.findOne({ userId }).lean()
      return res.json(profile?.data || {})
    } catch (e) {
      console.error('Error fetching profile from MongoDB:', e)
    }
  }
  res.json(profileStore[userId] || {})
})

router.put('/', requireAuth, async (req, res) => {
  const userId = (req as any).user.id
  const merged = { ...(profileStore[userId] || {}), ...req.body }

  if (isMongoReady()) {
    try {
      const profile = await ProfileModel.findOneAndUpdate(
        { userId },
        { userId, data: merged },
        { new: true, upsert: true }
      ).lean()
      return res.json(profile?.data || merged)
    } catch (e) {
      console.error('Error updating profile in MongoDB:', e)
    }
  }

  profileStore[userId] = merged
  res.json(profileStore[userId])
})

export default router
