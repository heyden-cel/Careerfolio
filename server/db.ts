import mongoose from 'mongoose'
import dotenv from 'dotenv'
import dns from 'node:dns'

dotenv.config()

// Ensure Node.js resolves Atlas SRV records smoothly across all networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch {
  // Ignore if custom DNS servers cannot be set
}

const MONGODB_URI = process.env.MONGODB_URI || ''

export async function connectDB(): Promise<boolean> {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI is not set. Using in-memory fallback.')
    return false
  }

  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB Atlas successfully.')
    return true
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    return false
  }
}
