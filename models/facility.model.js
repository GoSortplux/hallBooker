import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    chargeable: {
      type: Boolean,
      default: false,
    },
    chargeMethod: {
      type: String,
      enum: ['free', 'flat', 'per_hour'],
      default: 'free',
    },
    cost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Facility = mongoose.model('Facility', facilitySchema);
