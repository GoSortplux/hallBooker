import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    reservationId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be null for walk-in
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    eventDetails: { type: String, required: true },
    bookingDates: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
      },
    ],
    // Price snapshot at time of reservation
    totalPrice: { type: Number, required: true },
    hallPrice: { type: Number, required: true },
    facilitiesPrice: { type: Number, required: true },
    reservationFee: { type: Number, required: true },
    paymentReference: { type: String, required: true, unique: true },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CONVERTED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    cutoffDate: { type: Date, required: true, index: true },
    reservedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reservationType: {
      type: String,
      enum: ['online', 'walk-in'],
      default: 'online',
    },
    walkInUserDetails: {
      fullName: { type: String },
      email: { type: String },
      phone: { type: String },
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
    remindersSent: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const Reservation = mongoose.model('Reservation', reservationSchema);
