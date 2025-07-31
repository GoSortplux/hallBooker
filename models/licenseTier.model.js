import mongoose from 'mongoose';

const licenseTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    minHalls: {
      type: Number,
      required: true,
      default: 0,
    },
    maxHalls: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    durationInDays: {
      type: Number,
      required: false, // A null value indicates a lifetime license
      default: null
    },
  },
  { timestamps: true }
);

export const LicenseTier = mongoose.model('LicenseTier', licenseTierSchema);
