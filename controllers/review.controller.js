import { Review } from '../models/review.model.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const venueId = req.params.venueId;

  const booking = await Booking.findOne({
    user: req.user._id,
    venue: venueId,
    paymentStatus: 'paid',
    endTime: { $lt: new Date() }
  });
  if (!booking) throw new ApiError(403, "You can only review venues you have booked and attended.");

  const review = await Review.create({ rating, comment, venue: venueId, user: req.user._id });
  res.status(201).json(new ApiResponse(201, review, 'Review submitted successfully.'));
});

const getReviewsForVenue = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ venue: req.params.venueId }).populate('user', 'fullName');
  res.status(200).json(new ApiResponse(200, reviews, 'Reviews fetched successfully.'));
});

const updateReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, "Review not found.");
    if (review.user.toString() !== req.user._id.toString()) throw new ApiError(403, "You are not authorized to update this review.");

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();
    res.status(200).json(new ApiResponse(200, review, "Review updated."));
});

const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, "Review not found.");

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to delete this review.");
    }
    
    await review.deleteOne();
    res.status(200).json(new ApiResponse(200, {}, "Review deleted."));
});

export { createReview, getReviewsForVenue, updateReview, deleteReview };