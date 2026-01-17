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
  const { hallId, bookingId } = req.params;

  const booking = await Booking.findOne({
    _id: bookingId,
    user: req.user._id,
    hall: hallId
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found or you are not authorized to review it.");
  }

  if (booking.status !== 'confirmed') {
    throw new ApiError(403, "You can only review confirmed bookings.");
  }

  if (booking.paymentStatus !== 'paid') {
    throw new ApiError(403, "You can only review bookings that have been fully paid.");
  }

  // Get the latest endTime from bookingDates
  const lastBookingDate = booking.bookingDates.reduce((latest, current) => {
    return (new Date(current.endTime) > new Date(latest.endTime)) ? current : latest;
  }, booking.bookingDates[0]);

  if (new Date(lastBookingDate.endTime) > new Date()) {
    throw new ApiError(403, "You can only review halls after the event has ended.");
  }

  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) throw new ApiError(400, "You have already submitted a review for this booking.");

  const review = await Review.create({ rating, comment, hall: hallId, user: req.user._id, booking: bookingId });

  // Mark review notification as sent to prevent automated emails
  booking.reviewNotificationSent = true;
  await booking.save();

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

const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, "Review not found.");

    if (req.user.role !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to delete this review.");
    }
    
    await review.deleteOne();
    res.status(200).json(new ApiResponse(200, {}, "Review deleted."));
});

export {
  createReview,
  getReviewsForHall,
  deleteReview
};