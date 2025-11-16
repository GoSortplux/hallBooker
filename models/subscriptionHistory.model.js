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
      enum: ['pending', 'active', 'expired', 'cancelled', 'upgraded', 'failed', 'refunded'],
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    }, // Null for lifetime licenses
    transactionReference: {
      type: String,
    },
    paymentReference: {
      type: String,
    },
    paymentMethod: {
      type: String,
    },
  },
  { timestamps: true }
);

export const SubscriptionHistory = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
