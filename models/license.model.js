import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema(
  {
    owner: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      unique: true
    },
    type: { 
      type: String, 
      enum: ['1-year', '2-year', 'lifetime'],
      required: true 
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