import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      enum: ['Booking', 'Reservation', 'Subscription'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
