import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

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
