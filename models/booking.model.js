import mongoose from 'mongoose';
import Setting from './setting.model.js'; // Import the Setting model

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    eventDetails: { type: String, required: true },
    bookingDates: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
    hallPrice: { type: Number },
    facilitiesPrice: { type: Number },
    paymentMethod: {
      type: String,
      required: true
      // Enum is removed to allow for dynamic validation
    },
    paymentStatus: {
      type: String,
      default: 'pending',
      required: true,
      // Enum is removed to allow for dynamic validation
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled'],
        default: 'confirmed'
    },
    reviewNotificationSent: {
      type: Boolean,
      default: false,
    },
    paymentReference: {
      type: String,
      index: true,
      sparse: true,
    },
    transactionReference: {
      type: String,
      index: true,
    },
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookingType: {
      type: String,
      enum: ['online', 'walk-in'],
      default: 'online'
    },
    walkInUserDetails: {
      fullName: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringBookingId: {
      type: String,
      index: true,
    },
    selectedFacilities: [
      {
        facility: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Facility',
          required: true,
        },
        name: { type: String, required: true },
        cost: { type: Number, required: true },
        chargeMethod: { type: String, required: true },
        quantity: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

// Pre-save middleware for dynamic validation
bookingSchema.pre('save', async function (next) {
  if (this.isModified('paymentMethod') || this.isModified('paymentStatus')) {
    const paymentMethodsSetting = await Setting.findOne({ key: 'paymentMethods' });
    const paymentStatusesSetting = await Setting.findOne({ key: 'paymentStatuses' });

    if (paymentMethodsSetting && !paymentMethodsSetting.value.includes(this.paymentMethod)) {
      return next(new Error(`Invalid payment method: ${this.paymentMethod}`));
    }

    if (paymentStatusesSetting && !paymentStatusesSetting.value.includes(this.paymentStatus)) {
      return next(new Error(`Invalid payment status: ${this.paymentStatus}`));
    }
  }
  next();
});

export const Booking = mongoose.model('Booking', bookingSchema);
