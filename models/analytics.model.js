import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    type: { type: String, enum: ['view', 'demo-booking'], required: true },
  },
  { timestamps: true }
);

export const Analytics = mongoose.model('Analytics', analyticsSchema);
