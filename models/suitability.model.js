import mongoose from 'mongoose';

const suitabilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Suitability = mongoose.model('Suitability', suitabilitySchema);
