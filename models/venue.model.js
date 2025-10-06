import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    name: { type: String, required: true, trim: true, index: true },
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
    images: [{ type: String }],
    videos: [{ type: String }],
    facilities: { type: Map, of: String },
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
    manuallyBlockedSlots: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

venueSchema.virtual('directionUrl').get(function () {
  if (this.geoLocation && this.geoLocation.coordinates) {
    const [lng, lat] = this.geoLocation.coordinates;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
  }
  return null;
});

export const Venue = mongoose.model('Venue', venueSchema);