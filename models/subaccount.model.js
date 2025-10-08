import mongoose from 'mongoose';

const subAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    subAccountCode: {
      type: String,
      required: true,
      unique: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const SubAccount = mongoose.model('SubAccount', subAccountSchema);