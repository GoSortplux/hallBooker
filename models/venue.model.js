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
// Pre-save hook for validation
venueSchema.pre('save', function (next) {
  // This rule ensures that if a venue has images, it must also have at least one video.
  if (this.images.length > 0 && this.videos.length === 0) {
    const err = new Error('A venue with images must have at least one video.');
    return next(err);
  }
  next();
});

export const Venue = mongoose.model('Venue', venueSchema);