import express from 'express'
import cors from 'cors'
import authRouter     from './routes/auth.js'
import profileRouter  from './routes/profile.js'
import documentsRouter from './routes/documents.js'
import aiRouter     from './routes/ai.js'

const app  = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
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

app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`))
