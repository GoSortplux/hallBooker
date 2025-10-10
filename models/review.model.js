import mongoose from 'mongoose';
import { Hall } from './hall.model.js';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
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

reviewSchema.index({ hall: 1, user: 1 }, { unique: true });

reviewSchema.statics.calculateAverageRating = async function (hallId) {
  const stats = await this.aggregate([
    { $match: { hall: hallId } },
    {
      $group: {
        _id: '$hall',
        numRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Hall.findByIdAndUpdate(hallId, {
      averageRating: stats[0].avgRating.toFixed(1),
      numReviews: stats[0].numRatings,
    });
  } else {
    await Hall.findByIdAndUpdate(hallId, {
      averageRating: 0,
      numReviews: 0,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calculateAverageRating(this.hall);
});

reviewSchema.post('deleteOne', { document: true, query: false }, function () {
    this.constructor.calculateAverageRating(this.hall);
});


export const Review = mongoose.model('Review', reviewSchema);