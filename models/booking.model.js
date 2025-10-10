import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    eventDetails: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'pos', 'bank-transfer', 'online'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      required: true,
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled'],
        default: 'confirmed'
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
  },
  { timestamps: true }
);

export const Booking = mongoose.model('Booking', bookingSchema);