import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Booking } from '../models/booking.model.js';
import { Venue } from '../models/venue.model.js';
import sendEmail from '../services/email.service.js';

const createBooking = asyncHandler(async (req, res) => {
  const { venueId, startTime, endTime, eventDetails, totalPrice } = req.body;
  const venue = await Venue.findById(venueId).populate('owner', 'email fullName');
  if (!venue) throw new ApiError(404, 'Venue not found');

  const newBookingStartTime = new Date(startTime);
  const newBookingEndTime = new Date(endTime);

  const existingBooking = await Booking.findOne({
    venue: venueId,
    status: 'confirmed',
    $or: [
      { startTime: { $lt: newBookingEndTime, $gte: newBookingStartTime } },
      { endTime: { $gt: newBookingStartTime, $lte: newBookingEndTime } },
    ],
  });

  if (existingBooking) throw new ApiError(409, 'This time slot is already booked.');

  const booking = await Booking.create({
    venue: venueId,
    user: req.user._id,
    startTime: newBookingStartTime,
    endTime: newBookingEndTime,
    eventDetails,
    totalPrice,
    paymentStatus: 'paid', // Assuming payment is confirmed
  });

  try {
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
  } catch (emailError) {
      console.error(`Confirmation email failed for booking ${booking._id}:`, emailError.message);
  }

  res.status(201).json(new ApiResponse(201, booking, 'Booking created successfully!'));
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

export { createBooking, getMyBookings, getBookingById, updateBookingDetails, cancelBooking };