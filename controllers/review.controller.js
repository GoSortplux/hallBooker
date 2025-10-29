import { Review } from '../models/review.model.js';
import { Booking } from '../models/booking.model.js';
import { Hall } from '../models/hall.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from '../services/notification.service.js';

const createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const hallId = req.params.hallId;

  const booking = await Booking.findOne({
    user: req.user._id,
    hall: hallId,
    paymentStatus: 'paid',
    endTime: { $lt: new Date() }
  });
  if (!booking) throw new ApiError(403, "You can only review halls you have booked and attended.");

  const review = await Review.create({ rating, comment, hall: hallId, user: req.user._id });

  const hall = await Hall.findById(hallId);
  const io = req.app.get('io');

  // Notify hall owner
  createNotification(
    io,
    hall.owner.toString(),
    `You have received a new review for your hall: ${hall.name}.`,
    `/halls/${hallId}/reviews`
  );

  // Notify admins
  const admins = await User.find({ role: 'super-admin' });
  admins.forEach(admin => {
    createNotification(
      io,
      admin._id.toString(),
      `A new review has been submitted for hall: ${hall.name}.`,
      `/halls/${hallId}/reviews`
    );
  });

  res.status(201).json(new ApiResponse(201, review, 'Review submitted successfully.'));
});

const getReviewsForHall = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ hall: req.params.hallId }).populate('user', 'fullName');
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

export {
  createReview,
  getReviewsForHall,
  updateReview,
  deleteReview
};