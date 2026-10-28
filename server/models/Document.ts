import mongoose, { Schema } from 'mongoose'

const DocumentSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, default: 'portfolio' },
    title: { type: String, default: 'Untitled' },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, strict: false }
)

export const DocumentModel =
  mongoose.models.Document || mongoose.model('Document', DocumentSchema)
