import mongoose from 'mongoose';

const hallSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    name: { type: String, required: true, trim: true, index: true },
    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
    localGovernment: { type: mongoose.Schema.Types.ObjectId, ref: 'LocalGovernment', required: true },
    location: { type: String, required: true },
    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      address: {
        type: String,
      },
    },
    capacity: { type: Number, required: true },
    description: { type: String, required: true },
    images: {
      type: [{ type: String }],
      validate: [
        (val) => val.length <= 6,
        'A maximum of 6 images are allowed.',
      ],
    },
    videos: {
      type: [{ type: String }],
    },
    facilities: [
      {
        name: { type: String, required: true },
        available: { type: Boolean, default: true },
        chargeable: { type: Boolean, default: false },
        chargeMethod: {
          type: String,
          enum: ['free', 'flat', 'per_hour'],
          default: 'free',
        },
        cost: { type: Number, default: 0 },
      },
    ],
    carParkCapacity: { type: Number },
    hallSize: { type: String },
    pricing: {
      dailyRate: { type: Number },
      hourlyRate: { type: Number },
    },
    openingHour: { type: Number, min: 0, max: 23 },
    closingHour: { type: Number, min: 0, max: 23 },
    averageRating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    blockedDates: [{ type: Date, index: true }],
    allowRecurringBookings: { type: Boolean, default: false },
    recurringBookingDiscount: {
      percentage: { type: Number, default: 0 },
      minBookings: { type: Number, default: 0 },
    },
    views: { type: Number, default: 0 },
    demoBookings: { type: Number, default: 0 },
    isOnlineBookingEnabled: { type: Boolean, default: true },
    onlineBookingEnableTime: { type: Date },
    onlineBookingDisableTime: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

hallSchema.virtual('directionUrl').get(function () {
  if (this.geoLocation && this.geoLocation.coordinates) {
    const [lng, lat] = this.geoLocation.coordinates;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
  }
  return null;
});

export const Hall = mongoose.model('Hall', hallSchema);