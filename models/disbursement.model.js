import mongoose, { Schema } from 'mongoose';

const disbursementSchema = new Schema(
    {
        transactionReference: {
            type: String,
            required: true,
            unique: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        fee: {
            type: Number,
        },
        status: {
            type: String,
            required: true,
            enum: ['SUCCESS', 'FAILED', 'REVERSED'],
        },
        currency: {
            type: String,
            default: 'NGN',
        },
        narration: {
            type: String,
        },
        destinationBankName: {
            type: String,
        },
        destinationAccountNumber: {
            type: String,
        },
        destinationAccountName: {
            type: String,
        },
        completedOn: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

export const Disbursement = mongoose.model('Disbursement', disbursementSchema);
