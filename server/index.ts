import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import authRouter     from './routes/auth.js'
import profileRouter  from './routes/profile.js'
import documentsRouter from './routes/documents.js'
import aiRouter     from './routes/ai.js'

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth',      authRouter)
app.use('/api/profile',   profileRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/ai',        aiRouter)

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {}
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' })
  }
  console.log(`[Contact] From: ${name} <${email}>: ${message.slice(0, 60)}...`)
  res.json({ success: true, message: 'Message sent successfully!' })
})

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// Serve frontend assets in production / single-port deployment
const distPath = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
