import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import authRouter     from './routes/auth.js'
import profileRouter  from './routes/profile.js'
import documentsRouter from './routes/documents.js'
import aiRouter     from './routes/ai.js'
import { connectDB } from './db.js'

const app  = express()
const PORT = process.env.PORT || 3001

connectDB()

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
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const candidate1 = path.resolve(__dirname, '../dist')
const candidate2 = path.resolve(process.cwd(), 'dist')
const distPath = fs.existsSync(candidate1) ? candidate1 : candidate2
const hasDist = fs.existsSync(distPath)

console.log(`[Static] Dist directory: ${distPath} (found: ${hasDist})`)

app.use(express.static(distPath))

app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  const indexPath = path.join(distPath, 'index.html')
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath)
  }
  res.status(404).send(`
    <!doctype html>
    <html>
      <head><title>Build Required</title></head>
      <body style="font-family: system-ui, sans-serif; padding: 3rem; background: #0f172a; color: #f8fafc; line-height: 1.6;">
        <h1 style="color: #38bdf8;">Application Ready — Build Required</h1>
        <p>The server is running, but the frontend build was not found at <code>${indexPath}</code>.</p>
        <p>In your <b>Render Dashboard &gt; Settings</b>, ensure your <b>Build Command</b> is set to:</p>
        <pre style="background: #1e293b; padding: 1rem; border-radius: 8px; font-size: 1.1rem; color: #4ade80;">npm install &amp;&amp; npm run build</pre>
        <p>Then click <b>Manual Deploy &gt; Deploy latest commit</b>.</p>
      </body>
    </html>
  `)
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
