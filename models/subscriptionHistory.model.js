import mongoose from 'mongoose';

const subscriptionHistorySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
      enum: ['active', 'expired', 'cancelled', 'upgraded'],
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    }, // Null for lifetime licenses
    transactionId: {
      type: String,
    }, // Optional: for linking to a payment gateway transaction
  },
  { timestamps: true }
);

export const SubscriptionHistory = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
