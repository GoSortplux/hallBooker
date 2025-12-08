import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Booking } from '../models/booking.model.js';
import { createNotification } from '../services/notification.service.js';
import { Hall } from '../models/hall.model.js';
import Setting from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generateBookingConfirmationEmail, generateNewBookingNotificationEmailForOwner, generatePaymentConfirmationEmail } from '../utils/emailTemplates.js';
import { generatePdfReceipt } from '../utils/pdfGenerator.js';
import generateBookingId from '../utils/bookingIdGenerator.js';
import crypto from 'crypto';
import { calculateBookingPriceAndValidate } from '../utils/booking.utils.js';

const createRecurringBooking = asyncHandler(async (req, res) => {
  const { hallId, startTime, endTime, eventDetails, recurrenceRule, paymentMethod, paymentStatus, walkInUserDetails } = req.body;
  const io = req.app.get('io');

  const authorizedRoles = ['super-admin', 'hall-owner', 'staff'];
  if (!authorizedRoles.includes(req.user.activeRole)) {
    throw new ApiError(403, 'You are not authorized to create a recurring booking.');
  }

  if (!walkInUserDetails || !walkInUserDetails.fullName || !walkInUserDetails.phone) {
    throw new ApiError(400, 'Customer details (fullName, phone) are required.');
  }

  const paymentStatusesSetting = await Setting.findOne({ key: 'paymentStatuses' });
  const validPaymentStatuses = paymentStatusesSetting ? paymentStatusesSetting.value : [];
  if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
    throw new ApiError(400, `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`);
  }

  const paymentMethodsSetting = await Setting.findOne({ key: 'paymentMethods' });
  const validPaymentMethods = paymentMethodsSetting ? paymentMethodsSetting.value : [];
  let finalPaymentMethod = paymentMethod;

  if (paymentStatus === 'paid') {
    if (!finalPaymentMethod || !validPaymentMethods.includes(finalPaymentMethod)) {
      throw new ApiError(400, `A valid payment method is required when status is 'paid'. Must be one of: ${validPaymentMethods.join(', ')}`);
    }
  } else {
    finalPaymentMethod = 'online';
  }

  if (!recurrenceRule || typeof recurrenceRule !== 'object') {
    throw new ApiError(400, 'Recurrence rule is required and must be an object.');
  }

  const { frequency, daysOfWeek, dayOfMonth, endDate } = recurrenceRule;
  if (!frequency || !endDate || (frequency === 'weekly' && !daysOfWeek) || (frequency === 'monthly' && !dayOfMonth)) {
    throw new ApiError(400, 'Invalid recurrence rule provided.');
  }

  const hall = await Hall.findById(hallId).populate('owner', 'email fullName');
  if (!hall) throw new ApiError(404, 'Hall not found');
  if (!hall.allowRecurringBookings) throw new ApiError(400, 'This hall does not allow recurring bookings.');

  const initialStartTime = new Date(startTime);
  const initialEndTime = new Date(endTime);
  const recurrenceEndDate = new Date(endDate);

  const bookingDates = [];
  let currentDate = new Date(initialStartTime);

  while (currentDate <= recurrenceEndDate) {
    if (frequency === 'weekly') {
      if (daysOfWeek.includes(currentDate.getDay())) {
        bookingDates.push(new Date(currentDate));
      }
    } else if (frequency === 'monthly') {
      if (currentDate.getDate() === dayOfMonth) {
        bookingDates.push(new Date(currentDate));
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (bookingDates.length === 0) {
    throw new ApiError(400, 'No booking dates could be generated with the provided rule.');
  }

  const canOverrideReservation = ['super-admin', 'hall-owner', 'staff'].includes(req.user.role);
  const blockedDatesSet = new Set(hall.blockedDates.map(d => new Date(d).setHours(0, 0, 0, 0)));

  for (const date of bookingDates) {
    const bookingStart = new Date(date);
    bookingStart.setHours(initialStartTime.getHours(), initialStartTime.getMinutes(), initialStartTime.getSeconds());
    const bookingEnd = new Date(date);
    bookingEnd.setHours(initialEndTime.getHours(), initialEndTime.getMinutes(), initialEndTime.getSeconds());

    if (!canOverrideReservation && blockedDatesSet.has(new Date(date).setHours(0, 0, 0, 0))) {
      throw new ApiError(409, `The hall is reserved for ${date.toDateString()} and cannot be booked.`);
    }

    const existingBooking = await Booking.findOne({
      hall: hallId,
      $or: [
        { status: 'confirmed' },
        { paymentStatus: 'pending' }
      ],
      $and: [
        {
          $or: [
            { startTime: { $lt: bookingEnd, $gte: bookingStart } },
            { endTime: { $gt: bookingStart, $lte: bookingEnd } },
            { startTime: { $lte: bookingStart }, endTime: { $gte: bookingEnd } }
          ]
        }
      ]
    });
    if (existingBooking) {
      throw new ApiError(409, `Time slot on ${date.toDateString()} is already booked.`);
    }
  }

  const { totalPrice: singleBookingPrice } = calculateBookingPriceAndValidate(startTime, endTime, hall.pricing);
  let finalPricePerBooking = singleBookingPrice;

  if (hall.recurringBookingDiscount.percentage > 0 && bookingDates.length >= hall.recurringBookingDiscount.minBookings) {
    finalPricePerBooking = singleBookingPrice * (1 - hall.recurringBookingDiscount.percentage / 100);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const recurringBookingId = crypto.randomUUID();
    const createdBookings = [];

    for (const date of bookingDates) {
      const bookingId = await generateBookingId(hall.name);
      const bookingStart = new Date(date);
      bookingStart.setHours(initialStartTime.getHours(), initialStartTime.getMinutes(), initialStartTime.getSeconds());
      const bookingEnd = new Date(date);
      bookingEnd.setHours(initialEndTime.getHours(), initialEndTime.getMinutes(), initialEndTime.getSeconds());

      const bookingData = {
        bookingId,
        hall: hallId,
        startTime: bookingStart,
        endTime: bookingEnd,
        eventDetails,
        totalPrice: finalPricePerBooking,
        paymentMethod: finalPaymentMethod,
        paymentStatus: paymentStatus,
        bookingType: 'walk-in',
        bookedBy: req.user._id,
        walkInUserDetails: {
          fullName: walkInUserDetails.fullName,
          email: walkInUserDetails.email,
          phone: walkInUserDetails.phone,
        },
        isRecurring: true,
        recurringBookingId,
      };
      createdBookings.push(bookingData);
    }

    const newBookings = await Booking.create(createdBookings, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(new ApiResponse(201, { bookings: newBookings, recurringBookingId }, 'Recurring booking created successfully!'));

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Recurring booking failed:", error);
    throw new ApiError(500, 'Could not complete the recurring booking process.');
  }
});

const createBooking = asyncHandler(async (req, res) => {
  const { hallId, startTime, endTime, eventDetails, selectedFacilities: selectedFacilitiesData } = req.body;

  const hall = await Hall.findById(hallId).populate('owner', 'email fullName').populate('facilities.facility');
  if (!hall) throw new ApiError(404, 'Hall not found');

  if (!hall.pricing || (typeof hall.pricing !== 'object') || (!hall.pricing.hourlyRate && !hall.pricing.dailyRate)) {
    throw new ApiError(400, 'Hall does not have valid pricing information. Pricing should be an object with hourlyRate and/or dailyRate.');
  }

  const newBookingStartTime = new Date(startTime);
  const newBookingEndTime = new Date(endTime);

  // Check for reservations
  const canOverrideReservation = ['super-admin', 'hall-owner', 'staff'].includes(req.user.role);
  if (!canOverrideReservation && hall.blockedDates && hall.blockedDates.length > 0) {
    const blockedDatesSet = new Set(hall.blockedDates.map(d => new Date(d).setUTCHours(0, 0, 0, 0).getTime()));
    let currentDate = new Date(newBookingStartTime);
    while (currentDate <= newBookingEndTime) {
      const currentDay = new Date(currentDate).setUTCHours(0, 0, 0, 0);
      if (blockedDatesSet.has(currentDay)) {
        throw new ApiError(400, `The hall is reserved for ${new Date(currentDate).toDateString()} and cannot be booked.`);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Validation for future bookings
  if (newBookingStartTime < new Date()) {
    throw new ApiError(400, 'Booking must be in the future.');
  }

  // Prepare facilities data for price calculation
  const facilitiesToPrice = selectedFacilitiesData?.map(sf => {
    const hallFacility = hall.facilities.find(f => f.facility._id.toString() === sf.facilityId);
    if (!hallFacility) {
      throw new ApiError(404, `Facility with ID ${sf.facilityId} not found in this hall.`);
    }
    return { ...hallFacility.toObject(), requestedQuantity: sf.quantity };
  }) || [];

  const { totalPrice, facilitiesWithCalculatedCosts } = calculateBookingPriceAndValidate(startTime, endTime, hall.pricing, facilitiesToPrice);

  if (hall.openingHour && newBookingStartTime.getHours() < hall.openingHour) {
    throw new ApiError(400, `Hall is not open until ${hall.openingHour}:00.`);
  }
  if (hall.closingHour && newBookingEndTime.getHours() > hall.closingHour) {
    throw new ApiError(400, `Hall closes at ${hall.closingHour}:00.`);
  }

  const existingBooking = await Booking.findOne({
    hall: hallId,
    $or: [
        { status: 'confirmed' },
        { paymentStatus: 'pending' }
    ],
    $and: [
        {
          $or: [
            { startTime: { $lt: newBookingEndTime, $gte: newBookingStartTime } },
            { endTime: { $gt: newBookingStartTime, $lte: newBookingEndTime } },
            { startTime: { $lte: newBookingStartTime }, endTime: { $gte: newBookingEndTime } }
          ]
        }
    ]
  });

  if (existingBooking) throw new ApiError(409, 'This time slot is already booked.');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = await generateBookingId(hall.name);
    const bookingData = {
      bookingId,
      hall: hallId,
      user: req.user._id,
      startTime: newBookingStartTime,
      endTime: newBookingEndTime,
      eventDetails,
      totalPrice,
      paymentMethod: 'online',
      paymentStatus: 'pending',
      bookingType: 'online',
      bookedBy: req.user._id,
      selectedFacilities: facilitiesWithCalculatedCosts.map((cf, i) => ({
        ...cf,
        facility: selectedFacilitiesData[i].facilityId,
      })),
    };

    const newBookingArr = await Booking.create([bookingData], { session });
    const newBooking = newBookingArr[0];

    const bookingForEmail = { ...newBooking.toObject(), user: req.user, hall: hall };

    const pdfReceipt = generatePdfReceipt(bookingForEmail);
    const io = req.app.get('io');

    await sendEmail({
      io,
      email: req.user.email,
      subject: 'Booking Confirmation - HallBooker',
      html: generateBookingConfirmationEmail(bookingForEmail),
      attachments: [{
        filename: `receipt-${bookingForEmail.bookingId}.pdf`,
        content: Buffer.from(pdfReceipt),
        contentType: 'application/pdf'
      }],
      notification: {
        recipient: req.user._id.toString(),
        message: `Your booking for ${hall.name} has been confirmed.`,
        link: `/bookings/${newBooking._id}`,
      },
    });

    const admins = await User.find({ role: 'super-admin' });
    const adminEmails = admins.map(admin => admin.email);

    const notificationEmails = [hall.owner.email, ...adminEmails];

    await Promise.all(notificationEmails.map(email => {
        const userIsAdmin = admins.some(admin => admin.email === email);
        const recipient = userIsAdmin ? admins.find(admin => admin.email === email)._id : hall.owner._id;
        sendEmail({
            io,
            email,
            subject: 'New Booking Notification',
            html: generateNewBookingNotificationEmailForOwner(bookingForEmail),
            notification: {
                recipient: recipient.toString(),
                message: `A new booking has been made for hall: ${hall.name}.`,
                link: `/bookings/${newBooking._id}`,
            },
        })
    }));

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
  const { hallId, startTime, endTime, eventDetails, paymentMethod, paymentStatus, walkInUserDetails, selectedFacilities: selectedFacilitiesData } = req.body;
  const io = req.app.get('io');

  if (!walkInUserDetails || !walkInUserDetails.fullName || !walkInUserDetails.phone) {
    throw new ApiError(400, 'Walk-in user details (fullName, phone) are required.');
  }

  const paymentStatusesSetting = await Setting.findOne({ key: 'paymentStatuses' });
  const validPaymentStatuses = paymentStatusesSetting ? paymentStatusesSetting.value : [];

  if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
    throw new ApiError(400, `Invalid payment status provided. Must be one of: ${validPaymentStatuses.join(', ')}`);
  }

  const paymentMethodsSetting = await Setting.findOne({ key: 'paymentMethods' });
  const validPaymentMethods = paymentMethodsSetting ? paymentMethodsSetting.value : [];
  let finalPaymentMethod = paymentMethod;

  if (paymentStatus === 'paid') {
    if (!finalPaymentMethod || !validPaymentMethods.includes(finalPaymentMethod)) {
      throw new ApiError(400, `A valid payment method is required when payment status is 'paid'. Must be one of: ${validPaymentMethods.join(', ')}`);
    }
  } else {
    if (!finalPaymentMethod || !validPaymentMethods.includes(finalPaymentMethod)) {
      finalPaymentMethod = 'online';
    }
  }

  const hall = await Hall.findById(hallId).populate('owner', 'email fullName');
  if (!hall) throw new ApiError(404, 'Hall not found');

  const isHallOwner = hall.owner._id.toString() === req.user._id.toString();
  const isSuperAdmin = req.user.activeRole === 'super-admin';

  if (!isHallOwner && !isSuperAdmin) {
    throw new ApiError(403, 'You are not authorized to create a walk-in booking for this hall.');
  }

  if (!hall.pricing || (typeof hall.pricing !== 'object') || (!hall.pricing.hourlyRate && !hall.pricing.dailyRate)) {
    throw new ApiError(400, 'Hall does not have valid pricing information. Pricing should be an object with hourlyRate and/or dailyRate.');
  }

  const newBookingStartTime = new Date(startTime);
  const newBookingEndTime = new Date(endTime);

  if (newBookingStartTime < new Date()) {
    throw new ApiError(400, 'Booking must be in the future.');
  }

  const facilitiesToPrice = selectedFacilitiesData?.map(sf => {
    const hallFacility = hall.facilities.find(f => f.facility._id.toString() === sf.facilityId);
    if (!hallFacility) {
      throw new ApiError(404, `Facility with ID ${sf.facilityId} not found in this hall.`);
    }
    return { ...hallFacility.toObject(), requestedQuantity: sf.quantity };
  }) || [];

  const { totalPrice, facilitiesWithCalculatedCosts } = calculateBookingPriceAndValidate(startTime, endTime, hall.pricing, facilitiesToPrice);

  if (hall.openingHour && newBookingStartTime.getHours() < hall.openingHour) {
    throw new ApiError(400, `Hall is not open until ${hall.openingHour}:00.`);
  }
  if (hall.closingHour && newBookingEndTime.getHours() > hall.closingHour) {
    throw new ApiError(400, `Hall closes at ${hall.closingHour}:00.`);
  }

  const existingBooking = await Booking.findOne({
    hall: hallId,
    $or: [
        { status: 'confirmed' },
        { paymentStatus: 'pending' }
    ],
    $and: [
        {
          $or: [
            { startTime: { $lt: newBookingEndTime, $gte: newBookingStartTime } },
            { endTime: { $gt: newBookingStartTime, $lte: newBookingEndTime } },
            { startTime: { $lte: newBookingStartTime }, endTime: { $gte: newBookingEndTime } }
          ]
        }
    ]
  });

  if (existingBooking) throw new ApiError(409, 'This time slot is already booked.');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = await generateBookingId(hall.name);

    const bookingData = {
      bookingId,
      hall: hallId,
      startTime: newBookingStartTime,
      endTime: newBookingEndTime,
      eventDetails,
      totalPrice,
      paymentMethod: finalPaymentMethod,
      paymentStatus: paymentStatus,
      bookingType: 'walk-in',
      bookedBy: req.user._id,
      walkInUserDetails: {
        fullName: walkInUserDetails.fullName,
        email: walkInUserDetails.email,
        phone: walkInUserDetails.phone,
      },
      selectedFacilities: facilitiesWithCalculatedCosts.map((cf, i) => ({
        ...cf,
        facility: selectedFacilitiesData[i].facilityId,
      })),
    };

    const newBookingArr = await Booking.create([bookingData], { session });
    const newBooking = newBookingArr[0];

    await session.commitTransaction();

    // Notifications are sent only after the transaction is successful
    try {
      const bookingForEmail = {
        ...newBooking.toObject(),
        user: {
          fullName: walkInUserDetails.fullName,
          email: walkInUserDetails.email,
        },
        hall: hall,
      };

      if (walkInUserDetails.email) {
        const pdfReceipt = generatePdfReceipt(bookingForEmail);
        const emailSubject = paymentStatus === 'paid' ? 'Payment Confirmation - HallBooker' : 'Booking Confirmation - HallBooker';
        const emailHtml = paymentStatus === 'paid' ? generatePaymentConfirmationEmail(bookingForEmail) : generateBookingConfirmationEmail(bookingForEmail);

        await sendEmail({
          io,
          email: walkInUserDetails.email,
          subject: emailSubject,
          html: emailHtml,
          attachments: [{
            filename: `receipt-${bookingForEmail.bookingId}.pdf`,
            content: Buffer.from(pdfReceipt),
            contentType: 'application/pdf'
          }],
          notification: {
              recipient: hall.owner._id.toString(),
              message: `A walk-in booking for ${hall.name} has been confirmed.`,
              link: `/bookings/${newBooking._id}`,
            },
        });
      }

      const admins = await User.find({ role: 'super-admin' });
      const adminEmails = admins.map(admin => admin.email);
      const notificationEmails = [hall.owner.email, ...adminEmails];

      await Promise.all(notificationEmails.map(email => {
          const userIsAdmin = admins.some(admin => admin.email === email);
          const recipient = userIsAdmin ? admins.find(admin => admin.email === email)._id : hall.owner._id;
          return sendEmail({
              io,
              email,
              subject: 'New Walk-in Booking Notification',
              html: generateNewBookingNotificationEmailForOwner(bookingForEmail),
              notification: {
                  recipient: recipient.toString(),
                  message: `A new walk-in booking has been made for hall: ${hall.name}.`,
                  link: `/bookings/${newBooking._id}`,
              },
          });
      }));
    } catch (emailError) {
      // Even if email fails, the booking was successful. Log the error but don't crash.
      console.error('Email notification failed after successful booking:', emailError);
    }

    res.status(201).json(new ApiResponse(201, newBooking, `Walk-in booking created with ${paymentStatus} status.`));
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
    const bookings = await Booking.find({ user: req.user._id }).populate('hall', 'name location').populate('selectedFacilities.facility');
    res.status(200).json(new ApiResponse(200, bookings, "User bookings fetched successfully."));
});

const getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('user', 'fullName email').populate('hall', 'name location').populate('selectedFacilities.facility');
    if (!booking) throw new ApiError(404, "Booking not found");

    if (req.user.activeRole === 'user' && booking.user._id.toString() !== req.user._id.toString()) {
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
    const booking = await Booking.findById(req.params.id).populate('hall').populate('user');
    if (!booking) throw new ApiError(404, "Booking not found");

    if (booking.user.toString() !== req.user._id.toString() && req.user.activeRole !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to cancel this booking.");
    }
    
    booking.status = 'cancelled';
    await booking.save();

    const io = req.app.get('io');
    const hallOwner = booking.hall.owner;
    const user = booking.user;

    // Notify hall owner
    createNotification(
      io,
      hallOwner.toString(),
      `Booking #${booking.bookingId} for your hall ${booking.hall.name} has been cancelled.`,
      `/bookings/${booking._id}`
    );

    // Notify user
    createNotification(
      io,
      user._id.toString(),
      `Your booking #${booking.bookingId} for hall ${booking.hall.name} has been cancelled.`,
      `/bookings/${booking._id}`
    );

    // Notify admins
    const admins = await User.find({ role: 'super-admin' });
    admins.forEach(admin => {
      createNotification(
        io,
        admin._id.toString(),
        `Booking #${booking.bookingId} for hall ${booking.hall.name} has been cancelled.`,
        `/bookings/${booking._id}`
      );
    });

    res.status(200).json(new ApiResponse(200, booking, "Booking cancelled successfully."));
});

const getBookingByBookingId = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).populate('user', 'fullName email').populate('hall').populate('selectedFacilities.facility');
    if (!booking) throw new ApiError(404, "Booking not found");

    if (req.user.activeRole === 'user' && booking.user._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this booking.");
    }
    res.status(200).json(new ApiResponse(200, booking, "Booking details fetched."));
});

export {
  createRecurringBooking,
  createBooking,
  walkInBooking,
  getMyBookings,
  getBookingById,
  getBookingByBookingId,
  updateBookingDetails,
  cancelBooking,
};