import mongoose from 'mongoose';
import { Venue } from './venue.model.js';

const reviewSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    venue: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Venue', 
      required: true 
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ venue: 1, user: 1 }, { unique: true });

reviewSchema.statics.calculateAverageRating = async function (venueId) {
  const stats = await this.aggregate([
    { $match: { venue: venueId } },
    {
      $group: {
        _id: '$venue',
        numRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Venue.findByIdAndUpdate(venueId, {
      averageRating: stats[0].avgRating.toFixed(1),
      numReviews: stats[0].numRatings,
    });
  } else {
    await Venue.findByIdAndUpdate(venueId, {
      averageRating: 0,
      numReviews: 0,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calculateAverageRating(this.venue);
});

reviewSchema.post('deleteOne', { document: true, query: false }, function () {
    this.constructor.calculateAverageRating(this.venue);
});


export const Review = mongoose.model('Review', reviewSchema);