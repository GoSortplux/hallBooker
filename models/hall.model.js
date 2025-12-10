import mongoose from 'mongoose';
import Setting from './setting.model.js';

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
        facility: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Facility',
          required: true,
        },
        available: { type: Boolean, default: true },
        chargeable: { type: Boolean, default: false },
        chargeMethod: {
          type: String,
          default: 'free',
          validate: {
            validator: async function (value) {
              // Dynamically validate against the list stored in the Settings collection
              const chargeMethodsSetting = await Setting.findOne({ key: 'chargeMethods' });
              // If the setting is missing or the value is not an array, validation fails.
              if (!chargeMethodsSetting || !Array.isArray(chargeMethodsSetting.value)) {
                console.error("Critical: 'chargeMethods' setting is missing or malformed in the database.");
                return false;
              }
              // Check if the provided value is in the array from the settings.
              return chargeMethodsSetting.value.includes(value);
            },
            message: props => `${props.value} is not a valid charge method.`
          }
        },
        cost: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },
        chargePerUnit: { type: Boolean, default: false },
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
    directionUrl: {
      type: String,
    },
    bookingBufferInHours: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const Hall = mongoose.model('Hall', hallSchema);