import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // While we are moving to a dynamic model, we'll still enforce one active license per user for now.
    },
    tier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LicenseTier',
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'pending'
    },
    purchaseDate: { type: Date },
    expiryDate: { type: Date }, // Will be null for 'lifetime' type
  },
  { timestamps: true }
);

export const License = mongoose.model('License', licenseSchema);