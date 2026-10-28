import mongoose, { Schema } from 'mongoose'

const ProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, strict: false }
)

export const ProfileModel =
  mongoose.models.Profile || mongoose.model('Profile', ProfileSchema)
