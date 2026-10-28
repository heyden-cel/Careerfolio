import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/session.js'
import { DocumentModel } from '../models/Document.js'

const router = Router()
const docsStore: Record<string, any[]> = {}

const isMongoReady = () => mongoose.connection.readyState === 1

router.get('/', requireAuth, async (req, res) => {
  const userId = (req as any).user.id
  if (isMongoReady()) {
    try {
      const docs = await DocumentModel.find({ userId }).lean()
      return res.json(docs)
    } catch (e) {
      console.error('Error fetching docs from MongoDB:', e)
    }
  }
  res.json(docsStore[userId] || [])
})

router.post('/', requireAuth, async (req, res) => {
  const userId = (req as any).user.id
  const docId = req.body.id || Math.random().toString(36).slice(2)
  const doc = { ...req.body, id: docId, userId }

  if (isMongoReady()) {
    try {
      const created = await DocumentModel.create(doc)
      return res.status(201).json(created.toObject())
    } catch (e) {
      console.error('Error creating doc in MongoDB:', e)
    }
  }

  docsStore[userId] = [...(docsStore[userId] || []), doc]
  res.status(201).json(doc)
})

router.put('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).user.id
  const docId = req.params.id

  if (isMongoReady()) {
    try {
      const updated = await DocumentModel.findOneAndUpdate(
        { id: docId, userId },
        { ...req.body, id: docId, userId },
        { new: true, upsert: true }
      ).lean()
      return res.json(updated)
    } catch (e) {
      console.error('Error updating doc in MongoDB:', e)
    }
  }

  const list = docsStore[userId] || []
  const updatedList = list.map((d: any) => (d.id === docId ? { ...d, ...req.body } : d))
  docsStore[userId] = updatedList
  res.json(updatedList.find((d: any) => d.id === docId))
})

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).user.id
  const docId = req.params.id

  if (isMongoReady()) {
    try {
      await DocumentModel.deleteOne({ id: docId, userId })
      return res.json({ ok: true })
    } catch (e) {
      console.error('Error deleting doc in MongoDB:', e)
    }
  }

  docsStore[userId] = (docsStore[userId] || []).filter((d: any) => d.id !== docId)
  res.json({ ok: true })
})

export default router
