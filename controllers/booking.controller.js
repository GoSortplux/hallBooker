import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Booking } from '../models/booking.model.js';
import { Venue } from '../models/venue.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generateBookingConfirmationEmail, generateNewBookingNotificationEmailForOwner } from '../utils/emailTemplates.js';
import { generatePdfReceipt } from '../utils/pdfGenerator.js';
import generateBookingId from '../utils/bookingIdGenerator.js';
import { calculateBookingPriceAndValidate } from '../utils/booking.utils.js';

const createBooking = asyncHandler(async (req, res) => {
  const { venueId, startTime, endTime, eventDetails } = req.body;

  const venue = await Venue.findById(venueId).populate('owner', 'email fullName');
  if (!venue) throw new ApiError(404, 'Venue not found');

  if (!venue.pricing || (typeof venue.pricing !== 'object') || (!venue.pricing.hourlyRate && !venue.pricing.dailyRate)) {
    throw new ApiError(400, 'Venue does not have valid pricing information. Pricing should be an object with hourlyRate and/or dailyRate.');
  }

  const newBookingStartTime = new Date(startTime);
  const newBookingEndTime = new Date(endTime);

  // Validation for future bookings
  if (newBookingStartTime < new Date()) {
    throw new ApiError(400, 'Booking must be in the future.');
  }

  // Use the helper function for validation and price calculation
  const { totalPrice } = calculateBookingPriceAndValidate(startTime, endTime, venue.pricing);

  if (venue.openingHour && newBookingStartTime.getHours() < venue.openingHour) {
    throw new ApiError(400, `Venue is not open until ${venue.openingHour}:00.`);
  }
  if (venue.closingHour && newBookingEndTime.getHours() > venue.closingHour) {
    throw new ApiError(400, `Venue closes at ${venue.closingHour}:00.`);
  }

  const existingBooking = await Booking.findOne({
    venue: venueId,
    paymentStatus: 'paid',
    $or: [
      { startTime: { $lt: newBookingEndTime, $gte: newBookingStartTime } },
      { endTime: { $gt: newBookingStartTime, $lte: newBookingEndTime } },
    ],
  });

  if (existingBooking) throw new ApiError(409, 'This time slot is already booked.');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = await generateBookingId(venue.name);
    const bookingData = {
      bookingId,
      venue: venueId,
      user: req.user._id,
      startTime: newBookingStartTime,
      endTime: newBookingEndTime,
      eventDetails,
      totalPrice,
      paymentMethod: 'online',
      paymentStatus: 'pending',
      bookingType: 'online',
      bookedBy: req.user._id,
    };

    const newBookingArr = await Booking.create([bookingData], { session });
    const newBooking = newBookingArr[0];

    const bookingForEmail = { ...newBooking.toObject(), user: req.user, venue: venue };

    const pdfReceipt = generatePdfReceipt(bookingForEmail);

    await sendEmail({
      email: req.user.email,
      subject: 'Booking Confirmation - HallBooker',
      html: generateBookingConfirmationEmail(bookingForEmail),
      attachments: [{
        filename: `receipt-${bookingForEmail.bookingId}.pdf`,
        content: Buffer.from(pdfReceipt),
        contentType: 'application/pdf'
      }]
    });

    const admins = await User.find({ role: 'super-admin' });
    const adminEmails = admins.map(admin => admin.email);

    const notificationEmails = [venue.owner.email, ...adminEmails];

    await Promise.all(notificationEmails.map(email => sendEmail({
      email,
      subject: 'New Booking Notification',
      html: generateNewBookingNotificationEmailForOwner(bookingForEmail),
    })));

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

const walkInBooking = asyncHandler(async (req, res) => {
  const { venueId, startTime, endTime, eventDetails, paymentMethod, paymentStatus, walkInUserDetails } = req.body;

  if (!walkInUserDetails || !walkInUserDetails.fullName || !walkInUserDetails.phone) {
    throw new ApiError(400, 'Walk-in user details (fullName, phone) are required.');
  }

  if (!paymentStatus || !['pending', 'paid'].includes(paymentStatus)) {
    throw new ApiError(400, 'A valid paymentStatus ("pending" or "paid") is required.');
  }

  const venue = await Venue.findById(venueId).populate('owner', 'email fullName');
  if (!venue) throw new ApiError(404, 'Venue not found');

  const isVenueOwner = venue.owner._id.toString() === req.user._id.toString();
  const isSuperAdmin = req.user.role === 'super-admin';

  if (!isVenueOwner && !isSuperAdmin) {
    throw new ApiError(403, 'You are not authorized to create a walk-in booking for this venue.');
  }

  if (!venue.pricing || (typeof venue.pricing !== 'object') || (!venue.pricing.hourlyRate && !venue.pricing.dailyRate)) {
    throw new ApiError(400, 'Venue does not have valid pricing information. Pricing should be an object with hourlyRate and/or dailyRate.');
  }

  const newBookingStartTime = new Date(startTime);
  const newBookingEndTime = new Date(endTime);

  if (newBookingStartTime < new Date()) {
    throw new ApiError(400, 'Booking must be in the future.');
  }

  const { totalPrice } = calculateBookingPriceAndValidate(startTime, endTime, venue.pricing);

  if (venue.openingHour && newBookingStartTime.getHours() < venue.openingHour) {
    throw new ApiError(400, `Venue is not open until ${venue.openingHour}:00.`);
  }
  if (venue.closingHour && newBookingEndTime.getHours() > venue.closingHour) {
    throw new ApiError(400, `Venue closes at ${venue.closingHour}:00.`);
  }

  const existingBooking = await Booking.findOne({
    venue: venueId,
    paymentStatus: 'paid',
    $or: [
      { startTime: { $lt: newBookingEndTime, $gte: newBookingStartTime } },
      { endTime: { $gt: newBookingStartTime, $lte: newBookingEndTime } },
    ],
  });

  if (existingBooking) throw new ApiError(409, 'This time slot is already booked and paid for.');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = await generateBookingId(venue.name);
    const finalPaymentStatus = paymentStatus || 'pending';

    const bookingData = {
      bookingId,
      venue: venueId,
      startTime: newBookingStartTime,
      endTime: newBookingEndTime,
      eventDetails,
      totalPrice,
      paymentMethod: finalPaymentStatus === 'paid' ? paymentMethod : 'online',
      paymentStatus: finalPaymentStatus,
      bookingType: 'walk-in',
      bookedBy: req.user._id,
      walkInUserDetails: {
        fullName: walkInUserDetails.fullName,
        email: walkInUserDetails.email,
        phone: walkInUserDetails.phone,
      },
    };

    const newBookingArr = await Booking.create([bookingData], { session });
    const newBooking = newBookingArr[0];

    const bookingForEmail = {
      ...newBooking.toObject(),
      user: {
        fullName: walkInUserDetails.fullName,
        email: walkInUserDetails.email,
      },
      venue: venue,
    };

    if (walkInUserDetails.email) {
      const pdfReceipt = generatePdfReceipt(bookingForEmail);
      const emailSubject = finalPaymentStatus === 'paid' ? 'Payment Confirmation - HallBooker' : 'Booking Confirmation - HallBooker';
      const emailHtml = finalPaymentStatus === 'paid' ? generatePaymentConfirmationEmail(bookingForEmail) : generateBookingConfirmationEmail(bookingForEmail);

      await sendEmail({
        email: walkInUserDetails.email,
        subject: emailSubject,
        html: emailHtml,
        attachments: [{
          filename: `receipt-${bookingForEmail.bookingId}.pdf`,
          content: Buffer.from(pdfReceipt),
          contentType: 'application/pdf'
        }]
      });
    }

    const admins = await User.find({ role: 'super-admin' });
    const adminEmails = admins.map(admin => admin.email);
    const notificationEmails = [venue.owner.email, ...adminEmails];

    await Promise.all(notificationEmails.map(email => sendEmail({
      email,
      subject: 'New Walk-in Booking Notification',
      html: generateNewBookingNotificationEmailForOwner(bookingForEmail),
    })));

    await session.commitTransaction();
    res.status(201).json(new ApiResponse(201, newBooking, `Walk-in booking created with ${finalPaymentStatus} status.`));
  } catch (error) {
    await session.abortTransaction();
    console.error('Walk-in booking transaction failed:', error);
    throw new ApiError(
      500,
      'Could not complete the walk-in booking process. Please try again later.'
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

const getBookingByBookingId = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).populate('user', 'fullName email').populate('venue');
    if (!booking) throw new ApiError(404, "Booking not found");

    if (req.user.role === 'user' && booking.user._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this booking.");
    }
    res.status(200).json(new ApiResponse(200, booking, "Booking details fetched."));
});

export { 
  createBooking, 
  walkInBooking,
  getMyBookings, 
  getBookingById, 
  getBookingByBookingId,
  updateBookingDetails, 
  cancelBooking 
};