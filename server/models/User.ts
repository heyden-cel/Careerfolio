import mongoose, { Schema } from 'mongoose'

export interface IUser {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  passwordHash: string
  status: 'active' | 'suspended'
  failedLoginAttempts: number
  lockUntil: Date | null
  createdAt: Date
  updatedAt: Date
  isDefaultPassword?: boolean
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    isDefaultPassword: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

