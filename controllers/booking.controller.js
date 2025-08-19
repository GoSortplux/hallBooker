import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Booking } from '../models/booking.model.js';
import { Venue } from '../models/venue.model.js';
import sendEmail from '../services/email.service.js';

const createBooking = asyncHandler(async (req, res) => {
  const { venueId, startTime, endTime, eventDetails } = req.body;

  const venue = await Venue.findById(venueId).populate('owner', 'email fullName');
  if (!venue) throw new ApiError(404, 'Venue not found');

  if (!venue.pricing || (typeof venue.pricing !== 'object') || (!venue.pricing.hourlyRate && !venue.pricing.dailyRate)) {
    throw new ApiError(400, 'Venue does not have valid pricing information. Pricing should be an object with hourlyRate and/or dailyRate.');
  }

  const newBookingStartTime = new Date(startTime);
  const newBookingEndTime = new Date(endTime);

  // Validation checks
  if (newBookingStartTime >= newBookingEndTime) {
    throw new ApiError(400, 'Start time must be before end time.');
  }
  if (newBookingStartTime < new Date()) {
    throw new ApiError(400, 'Booking must be in the future.');
  }
  const bookingDurationHours = (newBookingEndTime - newBookingStartTime) / (1000 * 60 * 60); // in hours

  // Corrected duration validation
  if (bookingDurationHours * 60 < 30) { // bookingDurationHours is in hours, so convert to minutes for comparison
    throw new ApiError(400, 'Booking must be for at least 30 minutes.');
  }
  if (bookingDurationHours > 7 * 24) { // bookingDurationHours is in hours
    throw new ApiError(400, 'Booking cannot be for longer than 7 days.');
  }

  let totalPrice;
  if (venue.pricing.dailyRate && !venue.pricing.hourlyRate) {
    // If only daily rate is available, booking must be for at least a full day
    if (bookingDurationHours < 24) {
      throw new ApiError(400, 'This venue only supports daily bookings. Minimum booking is 24 hours.');
    }
    const bookingDurationDays = Math.ceil(bookingDurationHours / 24);
    totalPrice = bookingDurationDays * venue.pricing.dailyRate;
  } else if (venue.pricing.hourlyRate) {
    // If hourly rate is available, use it for any duration
    totalPrice = bookingDurationHours * venue.pricing.hourlyRate;
  } else {
    // This case should ideally not be reached due to the initial check, but as a fallback:
    const bookingDurationDays = Math.ceil(bookingDurationHours / 24);
    totalPrice = bookingDurationDays * venue.pricing.dailyRate;
  }

  if (venue.openingHour && newBookingStartTime.getHours() < venue.openingHour) {
    throw new ApiError(400, `Venue is not open until ${venue.openingHour}:00.`);
  }
  if (venue.closingHour && newBookingEndTime.getHours() > venue.closingHour) {
    throw new ApiError(400, `Venue closes at ${venue.closingHour}:00.`);
  }

  const existingBooking = await Booking.findOne({
    venue: venueId,
    status: 'confirmed',
    $or: [
      { startTime: { $lt: newBookingEndTime, $gte: newBookingStartTime } },
      { endTime: { $gt: newBookingStartTime, $lte: newBookingEndTime } },
    ],
  });

  if (existingBooking) throw new ApiError(409, 'This time slot is already booked.');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingData = {
      venue: venueId,
      user: req.user._id,
      startTime: newBookingStartTime,
      endTime: newBookingEndTime,
      eventDetails,
      totalPrice,
      paymentStatus: 'pending',
    };

    const newBookingArr = await Booking.create([bookingData], { session });
    const newBooking = newBookingArr[0];

    await sendEmail({
      email: req.user.email,
      subject: 'Booking Confirmation - HallBooker',
      html: `<h1>Your Booking is Confirmed!</h1><p>Details for venue: ${venue.name}</p>`,
    });
    await sendEmail({
      email: venue.owner.email,
      subject: 'New Booking Notification',
      html: `<h1>You have a new booking!</h1><p>Venue ${venue.name} has been booked by ${req.user.fullName}.</p>`,
    });

    await session.commitTransaction();
    res.status(201).json(new ApiResponse(201, newBooking, 'Booking created successfully!'));
  } catch (error) {
    await session.abortTransaction();
    console.error('Booking transaction failed:', error);
    throw new ApiError(
      500,
      'Could not complete the booking process. Please try again later.'
    );
  } finally {
    session.endSession();
  }
});

const getMyBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ user: req.user._id }).populate('venue', 'name location');
    res.status(200).json(new ApiResponse(200, bookings, "User bookings fetched successfully."));
});

const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('user', 'fullName email').populate('venue', 'name location');
    if (!booking) throw new ApiError(404, "Booking not found");

    if (req.user.role === 'user' && booking.user._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this booking.");
    }
    res.status(200).json(new ApiResponse(200, booking, "Booking details fetched."));
});

const updateBookingDetails = asyncHandler(async (req, res) => {
    const { eventDetails } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.user.toString() !== req.user._id.toString()) throw new ApiError(403, "You can only update your own bookings.");
    
    booking.eventDetails = eventDetails || booking.eventDetails;
    const updatedBooking = await booking.save();
    res.status(200).json(new ApiResponse(200, updatedBooking, "Booking updated."));
});

const cancelBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new ApiError(404, "Booking not found");

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to cancel this booking.");
    }
    
    booking.status = 'cancelled';
    await booking.save();
    res.status(200).json(new ApiResponse(200, booking, "Booking cancelled successfully."));
});

export { 
  createBooking, 
  getMyBookings, 
  getBookingById, 
  updateBookingDetails, 
  cancelBooking 
};