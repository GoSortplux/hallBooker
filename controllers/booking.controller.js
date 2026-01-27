import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Booking } from '../models/booking.model.js';
import { Reservation } from '../models/reservation.model.js';
import { Review } from '../models/review.model.js';
import { createNotification } from '../services/notification.service.js';
import { Hall } from '../models/hall.model.js';
import Setting from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generateBookingConfirmationEmail, generateNewBookingNotificationEmailForOwner, generatePaymentConfirmationEmail, generateRecurringBookingConfirmationEmail } from '../utils/emailTemplates.js';
import { generatePdfReceipt, generateRecurringBookingPdfReceipt } from '../utils/pdfGenerator.js';
import generateBookingId from '../utils/bookingIdGenerator.js';
import { getCompanyName } from '../utils/settings.js';
import crypto from 'crypto';
import { calculateBookingPriceAndValidate } from '../utils/booking.utils.js';
import { bookingQueue } from '../jobs/queues/index.js';

const createRecurringBooking = asyncHandler(async (req, res) => {
  const { hallId, startTime, endTime, eventDetails, recurrenceRule, paymentMethod, paymentStatus, walkInUserDetails, dates, overrideReservation, selectedFacilities: selectedFacilitiesData } = req.body;
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

  if (!recurrenceRule && !dates) {
    throw new ApiError(400, 'Either a recurrence rule or a list of dates is required.');
  }

  const hall = await Hall.findById(hallId).populate('owner', 'email fullName').populate('facilities.facility');
  if (!hall) throw new ApiError(404, 'Hall not found');
  if (!hall.allowRecurringBookings) throw new ApiError(400, 'This hall does not allow recurring bookings.');

  const initialStartTime = new Date(startTime);
  const initialEndTime = new Date(endTime);
  const eventDuration = initialEndTime.getTime() - initialStartTime.getTime();
  let bookingDates = [];

  if (recurrenceRule) {
    const { frequency, daysOfWeek, dayOfMonth, endDate } = recurrenceRule;
    if (!frequency || !endDate || (frequency === 'weekly' && !daysOfWeek) || (frequency === 'monthly' && !dayOfMonth)) {
      throw new ApiError(400, 'Invalid recurrence rule provided.');
    }
    const recurrenceEndDate = new Date(endDate);
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
  } else {
      dates.forEach(dateStr => {
          bookingDates.push(new Date(dateStr));
      });
  }

  if (bookingDates.length === 0) {
    throw new ApiError(400, 'No booking dates could be generated with the provided rule.');
  }

  const canOverrideReservation = ['super-admin', 'hall-owner', 'staff'].includes(req.user.activeRole);
  const blockedDatesSet = new Set(hall.blockedDates.map(d => new Date(d).setUTCHours(0, 0, 0, 0)));
  const bufferMilliseconds = (hall.bookingBufferInHours || 0) * 60 * 60 * 1000;

  const generatedBookingRanges = bookingDates.map(date => {
    const bookingStart = new Date(date);
    bookingStart.setHours(initialStartTime.getHours(), initialStartTime.getMinutes(), initialStartTime.getSeconds());
    const bookingEnd = new Date(bookingStart.getTime() + eventDuration);
    return { startTime: bookingStart, endTime: bookingEnd };
  });

  for (const range of generatedBookingRanges) {
    let checkDate = new Date(range.startTime);
    while (checkDate <= range.endTime) {
      if (blockedDatesSet.has(new Date(checkDate).setUTCHours(0, 0, 0, 0))) {
        if (!canOverrideReservation || !overrideReservation) {
          throw new ApiError(409, `The hall is reserved for ${checkDate.toDateString()} and cannot be booked. To proceed, an admin must use the 'overrideReservation' flag.`);
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
  }

  const isSameCustomer = (item) => {
    const sameEmail = item.walkInUserDetails?.email && walkInUserDetails.email && item.walkInUserDetails.email === walkInUserDetails.email;
    const samePhone = item.walkInUserDetails?.phone && walkInUserDetails.phone && item.walkInUserDetails.phone === walkInUserDetails.phone;
    const sameUser = item.user && req.user._id && item.user.toString() === req.user._id.toString();
    return sameEmail || samePhone || sameUser;
  };

  const bufferedOrQuery = generatedBookingRanges.map(range => ({
    bookingDates: {
      $elemMatch: {
        startTime: { $lt: new Date(range.endTime.getTime() + bufferMilliseconds) },
        endTime: { $gt: new Date(range.startTime.getTime() - bufferMilliseconds) },
      },
    },
  }));

  // 1. Bulk Check Reservation Documents
  const conflictingReservations = await Reservation.find({
    hall: hallId,
    status: 'ACTIVE',
    $or: bufferedOrQuery
  });

  for (const resv of conflictingReservations) {
    const hasHardOverlap = resv.bookingDates.some(rd =>
      generatedBookingRanges.some(gr => gr.startTime < rd.endTime && gr.endTime > rd.startTime)
    );
    if (hasHardOverlap) {
      throw new ApiError(409, "One or more dates conflict with an existing reservation.");
    }
    if (!isSameCustomer(resv)) {
      throw new ApiError(409, "One or more dates are unavailable due to a required buffer period from a reservation.");
    }
  }

  // 2. Bulk Check Booking Documents
  const conflictingBookings = await Booking.find({
    hall: hallId,
    $or: [{ status: 'confirmed' }, { paymentStatus: 'pending' }],
    $and: [{ $or: bufferedOrQuery }]
  });

  for (const book of conflictingBookings) {
    const hasHardOverlap = book.bookingDates.some(bd =>
      generatedBookingRanges.some(gr => gr.startTime < bd.endTime && gr.endTime > bd.startTime)
    );
    if (hasHardOverlap) {
      throw new ApiError(409, "One or more dates conflict with an existing booking.");
    }
    if (!isSameCustomer(book)) {
      throw new ApiError(409, "One or more dates are unavailable due to a required buffer period from an existing booking.");
    }
  }

  // Prepare facilities data for price calculation
  const facilitiesToPrice = selectedFacilitiesData?.map(sf => {
    const hallFacility = hall.facilities.find(f => f.facility._id.toString() === sf.facilityId);
    if (!hallFacility) {
      throw new ApiError(404, `Facility with ID ${sf.facilityId} not found in this hall.`);
    }
    return { ...hallFacility.toObject(), requestedQuantity: sf.quantity };
  }) || [];

  const { totalPrice: singleBookingPrice, hallPrice: singleBookingHallPrice, facilitiesPrice: singleBookingFacilitiesPrice, facilitiesWithCalculatedCosts } = calculateBookingPriceAndValidate([{ startTime: initialStartTime, endTime: initialEndTime }], hall.pricing, facilitiesToPrice);
  let finalPricePerBooking = singleBookingPrice;
  let finalHallPricePerBooking = singleBookingHallPrice;
  let finalFacilitiesPricePerBooking = singleBookingFacilitiesPrice;

  if (hall.recurringBookingDiscount.percentage > 0 && bookingDates.length >= hall.recurringBookingDiscount.minBookings) {
    const discountFactor = (1 - hall.recurringBookingDiscount.percentage / 100);

    finalHallPricePerBooking = Math.round((singleBookingHallPrice * discountFactor) * 100) / 100;

    // Apply discount to each facility cost and ensure the sum matches finalFacilitiesPricePerBooking
    let totalDiscountedFacilitiesPrice = 0;
    facilitiesWithCalculatedCosts.forEach(facility => {
      facility.cost = Math.round((facility.cost * discountFactor) * 100) / 100;
      totalDiscountedFacilitiesPrice += facility.cost;
    });

    finalFacilitiesPricePerBooking = Math.round(totalDiscountedFacilitiesPrice * 100) / 100;
    finalPricePerBooking = Math.round((finalHallPricePerBooking + finalFacilitiesPricePerBooking) * 100) / 100;
  }

  const firstBookingId = await generateBookingId(hall.name, 0);
  const recurringBookingId = `REC-${firstBookingId}`;

  const bookingDateRanges = bookingDates.map(date => {
    const bookingStart = new Date(date);
    bookingStart.setHours(initialStartTime.getHours(), initialStartTime.getMinutes(), initialStartTime.getSeconds());
    const bookingEnd = new Date(bookingStart.getTime() + eventDuration);
    return { startTime: bookingStart, endTime: bookingEnd };
  });

  // Queue bulk booking creation
  await bookingQueue.add('createRecurringBookings', {
    hallId,
    bookingDates: bookingDateRanges,
    eventDetails,
    finalPaymentMethod,
    paymentStatus,
    bookedBy: req.user._id,
    walkInUserDetails: {
      fullName: walkInUserDetails.fullName,
      email: walkInUserDetails.email,
      phone: walkInUserDetails.phone,
    },
    recurringBookingId,
    finalPricePerBooking,
    finalHallPricePerBooking,
    finalFacilitiesPricePerBooking,
    facilitiesWithCalculatedCosts,
    selectedFacilitiesData
  });

  return res.status(202).json(new ApiResponse(202, { recurringBookingId }, 'Recurring booking is being processed in the background.'));
});

const createBooking = asyncHandler(async (req, res) => {
  const { hallId, bookingDates, eventDetails, selectedFacilities: selectedFacilitiesData } = req.body;

  const hall = await Hall.findById(hallId).populate('owner', 'email fullName').populate('facilities.facility');
  if (!hall) throw new ApiError(404, 'Hall not found');

  if (!hall.pricing || (typeof hall.pricing !== 'object') || (!hall.pricing.hourlyRate && !hall.pricing.dailyRate)) {
    throw new ApiError(400, 'Hall does not have valid pricing information. Pricing should be an object with hourlyRate and/or dailyRate.');
  }

  for (const bookingDate of bookingDates) {
    const { startTime, endTime } = bookingDate;
    const newBookingStartTime = new Date(startTime);
    const newBookingEndTime = new Date(endTime);

    // Check for admin blocked dates
    if (hall.blockedDates && hall.blockedDates.length > 0) {
      const blockedDatesSet = new Set(hall.blockedDates.map(d => new Date(d).setUTCHours(0, 0, 0, 0)));
      let currentDate = new Date(newBookingStartTime);
      while (currentDate <= newBookingEndTime) {
        const currentDay = new Date(currentDate).setUTCHours(0, 0, 0, 0);
        if (blockedDatesSet.has(currentDay)) {
          throw new ApiError(409, `The hall is reserved for ${new Date(currentDate).toDateString()} and cannot be booked.`);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Validation for future bookings
    if (newBookingStartTime < new Date()) {
      throw new ApiError(400, 'Booking must be in the future.');
    }

    if (hall.openingHour && newBookingStartTime.getHours() < hall.openingHour) {
      throw new ApiError(400, `Hall is not open until ${hall.openingHour}:00.`);
    }
    if (hall.closingHour && newBookingEndTime.getHours() > hall.closingHour) {
      throw new ApiError(400, `Hall closes at ${hall.closingHour}:00.`);
    }
  }

  const bufferMilliseconds = (hall.bookingBufferInHours || 0) * 60 * 60 * 1000;

  // Helper to check same user
  const isSameUser = (item) => {
    return (item.user && item.user.toString() === req.user._id.toString()) ||
           (item.walkInUserDetails && item.walkInUserDetails.email === req.user.email);
  };

  // 1. Check Reservation Documents
  const reservationOrQuery = bookingDates.map(date => {
    const startTime = new Date(date.startTime);
    const endTime = new Date(date.endTime);
    const bufferedStartTime = new Date(startTime.getTime() - bufferMilliseconds);
    const bufferedEndTime = new Date(endTime.getTime() + bufferMilliseconds);
    return { 'bookingDates.startTime': { $lt: bufferedEndTime }, 'bookingDates.endTime': { $gt: bufferedStartTime } };
  });

  const conflictingReservations = await Reservation.find({
    hall: hallId,
    $or: reservationOrQuery,
    status: 'ACTIVE',
  });

  for (const resv of conflictingReservations) {
    const hasHardOverlap = resv.bookingDates.some(rd =>
      bookingDates.some(bd => new Date(bd.startTime) < new Date(rd.endTime) && new Date(bd.endTime) > new Date(rd.startTime))
    );
    if (hasHardOverlap) {
      throw new ApiError(409, "This time slot conflicts with an existing reservation.");
    }
    if (!isSameUser(resv)) {
      throw new ApiError(409, "This time slot is unavailable due to a conflicting reservation or its required buffer period.");
    }
  }

  // 2. Check Booking Documents
  const orQuery = bookingDates.map(bookingDate => {
    const bufferedStartTime = new Date(new Date(bookingDate.startTime).getTime() - bufferMilliseconds);
    const bufferedEndTime = new Date(new Date(bookingDate.endTime).getTime() + bufferMilliseconds);
    return {
      bookingDates: {
        $elemMatch: {
          startTime: { $lt: bufferedEndTime },
          endTime: { $gt: bufferedStartTime },
        },
      },
    };
  });

  const conflictingBookings = await Booking.find({
    hall: hallId,
    $or: [
      { status: 'confirmed' },
      { paymentStatus: 'pending' }
    ],
    $and: [{ $or: orQuery }]
  });

  for (const book of conflictingBookings) {
    const hasHardOverlap = book.bookingDates.some(bd1 =>
      bookingDates.some(bd2 => new Date(bd2.startTime) < new Date(bd1.endTime) && new Date(bd2.endTime) > new Date(bd1.startTime))
    );
    if (hasHardOverlap) {
      throw new ApiError(409, "This time slot conflicts with an existing booking.");
    }
    if (!isSameUser(book)) {
      throw new ApiError(409, "This time slot is unavailable due to a conflicting booking or its required buffer period.");
    }
  }

  // Prepare facilities data for price calculation
  const facilitiesToPrice = selectedFacilitiesData?.map(sf => {
    const hallFacility = hall.facilities.find(f => f.facility._id.toString() === sf.facilityId);
    if (!hallFacility) {
      throw new ApiError(404, `Facility with ID ${sf.facilityId} not found in this hall.`);
    }
    return { ...hallFacility.toObject(), requestedQuantity: sf.quantity };
  }) || [];

  const { totalPrice, hallPrice, facilitiesPrice, facilitiesWithCalculatedCosts } = calculateBookingPriceAndValidate(bookingDates, hall.pricing, facilitiesToPrice);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = await generateBookingId(hall.name);
    const bookingData = {
      bookingId,
      hall: hallId,
      user: req.user._id,
      bookingDates,
      eventDetails,
      totalPrice,
      hallPrice,
      facilitiesPrice,
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

    await session.commitTransaction();

    // Notifications are sent only after the transaction is successful
    try {
      // Refetch the booking to ensure all fields (like createdAt) and populated paths are available.
      const finalBooking = await Booking.findById(newBooking._id)
        .populate('user', 'fullName email phone')
        .populate({
            path: 'hall',
            populate: {
                path: 'owner',
                select: 'fullName email'
            }
        })
        .populate('selectedFacilities.facility');

      if (!finalBooking) {
        // This is a failsafe. If this happens, something is seriously wrong.
        throw new Error(`Failed to refetch booking with ID ${newBooking._id} after transaction commit.`);
      }

      const io = req.app.get('io');
      const companyName = await getCompanyName();

      // Send confirmation to the user who made the booking
      const pdfReceipt = generatePdfReceipt(finalBooking, companyName);
      await sendEmail({
        io,
        email: finalBooking.user.email,
        subject: `Booking Confirmation - ${companyName}`,
        html: generateBookingConfirmationEmail(finalBooking, companyName),
        attachments: [{
          filename: `receipt-${finalBooking.bookingId}.pdf`,
          content: Buffer.from(pdfReceipt),
          contentType: 'application/pdf'
        }],
        notification: {
          recipient: finalBooking.user._id.toString(),
          message: `Your booking for ${finalBooking.hall.name} has been confirmed.`,
          link: `/bookings/${finalBooking._id}`,
        },
      });

      // Send notification to hall owner and all admins
      const admins = await User.find({ role: 'super-admin' }).select('fullName email').lean();
      const hallOwner = finalBooking.hall.owner;
      const customer = finalBooking.user;

      const notificationRecipients = new Map();
      notificationRecipients.set(hallOwner.email, hallOwner);
      admins.forEach(admin => notificationRecipients.set(admin.email, admin));

      await Promise.all(
        Array.from(notificationRecipients.values()).map(recipient => {
          return sendEmail({
            io,
            email: recipient.email,
            subject: 'New Booking Notification',
            html: generateNewBookingNotificationEmailForOwner(recipient, customer, finalBooking, companyName),
            notification: {
              recipient: recipient._id.toString(),
              message: `A new booking has been made for hall: ${finalBooking.hall.name}.`,
              link: `/bookings/${finalBooking._id}`,
            },
          });
        })
      );
    } catch (emailError) {
        console.error('Email notification failed after successful booking:', emailError);
    }

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
  const { hallId, bookingDates, eventDetails, paymentMethod, paymentStatus, walkInUserDetails, selectedFacilities: selectedFacilitiesData, overrideReservation } = req.body;
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

  const hall = await Hall.findById(hallId).populate('owner', 'email fullName').populate('facilities.facility');
  if (!hall) throw new ApiError(404, 'Hall not found');

  const isHallOwner = hall.owner._id.toString() === req.user._id.toString();
  const isSuperAdmin = req.user.activeRole === 'super-admin';

  if (!isHallOwner && !isSuperAdmin) {
    throw new ApiError(403, 'You are not authorized to create a walk-in booking for this hall.');
  }

  if (!hall.pricing || (typeof hall.pricing !== 'object') || (!hall.pricing.hourlyRate && !hall.pricing.dailyRate)) {
    throw new ApiError(400, 'Hall does not have valid pricing information. Pricing should be an object with hourlyRate and/or dailyRate.');
  }

  for (const bookingDate of bookingDates) {
    const { startTime, endTime } = bookingDate;
    const newBookingStartTime = new Date(startTime);
    const newBookingEndTime = new Date(endTime);

    // Check for admin blocked dates
    if (hall.blockedDates && hall.blockedDates.length > 0) {
      const blockedDatesSet = new Set(hall.blockedDates.map(d => new Date(d).setUTCHours(0, 0, 0, 0)));
      let currentDate = new Date(newBookingStartTime);
      while (currentDate <= newBookingEndTime) {
        const currentDay = new Date(currentDate).setUTCHours(0, 0, 0, 0);
        if (blockedDatesSet.has(currentDay)) {
          if (!overrideReservation) {
            throw new ApiError(409, `The hall is reserved for ${new Date(currentDate).toDateString()} and cannot be booked. To proceed, send the request again with an 'overrideReservation: true' flag.`);
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    if (newBookingStartTime < new Date()) {
      throw new ApiError(400, 'Booking must be in the future.');
    }

    if (hall.openingHour && newBookingStartTime.getHours() < hall.openingHour) {
      throw new ApiError(400, `Hall is not open until ${hall.openingHour}:00.`);
    }
    if (hall.closingHour && newBookingEndTime.getHours() > hall.closingHour) {
      throw new ApiError(400, `Hall closes at ${hall.closingHour}:00.`);
    }
  }

  const bufferMilliseconds = (hall.bookingBufferInHours || 0) * 60 * 60 * 1000;

  // Helper to check same customer for walk-in
  const isSameCustomer = (item) => {
    const sameEmail = item.walkInUserDetails?.email && walkInUserDetails.email && item.walkInUserDetails.email === walkInUserDetails.email;
    const samePhone = item.walkInUserDetails?.phone && walkInUserDetails.phone && item.walkInUserDetails.phone === walkInUserDetails.phone;
    return sameEmail || samePhone;
  };

  // 1. Check Reservation Documents
  const reservationOrQuery = bookingDates.map(date => {
    const startTime = new Date(date.startTime);
    const endTime = new Date(date.endTime);
    const bufferedStartTime = new Date(startTime.getTime() - bufferMilliseconds);
    const bufferedEndTime = new Date(endTime.getTime() + bufferMilliseconds);
    return { 'bookingDates.startTime': { $lt: bufferedEndTime }, 'bookingDates.endTime': { $gt: bufferedStartTime } };
  });

  const conflictingReservations = await Reservation.find({
    hall: hallId,
    $or: reservationOrQuery,
    status: 'ACTIVE',
  });

  for (const resv of conflictingReservations) {
    const hasHardOverlap = resv.bookingDates.some(rd =>
      bookingDates.some(bd => new Date(bd.startTime) < new Date(rd.endTime) && new Date(bd.endTime) > new Date(rd.startTime))
    );
    if (hasHardOverlap) {
      throw new ApiError(409, "This time slot conflicts with an existing reservation.");
    }
    if (!isSameCustomer(resv)) {
      throw new ApiError(409, "This time slot is unavailable due to a conflicting reservation or its required buffer period.");
    }
  }

  // 2. Check Booking Documents
  const orQuery = bookingDates.map(bookingDate => {
    const bufferedStartTime = new Date(new Date(bookingDate.startTime).getTime() - bufferMilliseconds);
    const bufferedEndTime = new Date(new Date(bookingDate.endTime).getTime() + bufferMilliseconds);
    return {
      bookingDates: {
        $elemMatch: {
          startTime: { $lt: bufferedEndTime },
          endTime: { $gt: bufferedStartTime },
        },
      },
    };
  });

  const conflictingBookings = await Booking.find({
    hall: hallId,
    $or: [
      { status: 'confirmed' },
      { paymentStatus: 'pending' }
    ],
    $and: [{ $or: orQuery }]
  });

  for (const book of conflictingBookings) {
    const hasHardOverlap = book.bookingDates.some(bd1 =>
      bookingDates.some(bd2 => new Date(bd2.startTime) < new Date(bd1.endTime) && new Date(bd2.endTime) > new Date(bd1.startTime))
    );
    if (hasHardOverlap) {
      throw new ApiError(409, "This time slot conflicts with an existing booking.");
    }
    if (!isSameCustomer(book)) {
      throw new ApiError(409, "This time slot is unavailable due to a conflicting booking or its required buffer period.");
    }
  }

  const facilitiesToPrice = selectedFacilitiesData?.map(sf => {
    const hallFacility = hall.facilities.find(f => f.facility._id.toString() === sf.facilityId);
    if (!hallFacility) {
      throw new ApiError(404, `Facility with ID ${sf.facilityId} not found in this hall.`);
    }
    return { ...hallFacility.toObject(), requestedQuantity: sf.quantity };
  }) || [];

  const { totalPrice, hallPrice, facilitiesPrice, facilitiesWithCalculatedCosts } = calculateBookingPriceAndValidate(bookingDates, hall.pricing, facilitiesToPrice);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = await generateBookingId(hall.name);

    const bookingData = {
      bookingId,
      hall: hallId,
      bookingDates,
      eventDetails,
      totalPrice,
      hallPrice,
      facilitiesPrice,
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

      const companyName = await getCompanyName();
      if (walkInUserDetails.email) {
        const pdfReceipt = generatePdfReceipt(bookingForEmail, companyName);
        const emailSubject = paymentStatus === 'paid' ? `Payment Confirmation - ${companyName}` : `Booking Confirmation - ${companyName}`;
        const emailHtml = paymentStatus === 'paid' ? generatePaymentConfirmationEmail(bookingForEmail, companyName) : generateBookingConfirmationEmail(bookingForEmail, companyName);

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

      const admins = await User.find({ role: 'super-admin' }).select('fullName email').lean();
      const notificationRecipients = new Map();
      notificationRecipients.set(hall.owner.email, hall.owner);
      admins.forEach(admin => notificationRecipients.set(admin.email, admin));

      const customer = {
          fullName: walkInUserDetails.fullName,
          email: walkInUserDetails.email,
          phone: walkInUserDetails.phone
      };

      await Promise.all(Array.from(notificationRecipients.values()).map(recipient => {
          return sendEmail({
              io,
              email: recipient.email,
              subject: 'New Walk-in Booking Notification',
              html: generateNewBookingNotificationEmailForOwner(recipient, customer, bookingForEmail, companyName),
              notification: {
                  recipient: recipient._id.toString(),
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
    const bookings = await Booking.find({ user: req.user._id })
        .populate('hall', 'name location')
        .populate('selectedFacilities.facility');

    const bookingIds = bookings.map((b) => b._id);
    const reviews = await Review.find({ booking: { $in: bookingIds } }).select(
        'rating comment booking'
    );

    const reviewMap = reviews.reduce((acc, review) => {
        acc[review.booking.toString()] = {
            rating: review.rating,
            comment: review.comment,
        };
        return acc;
    }, {});

    const bookingsWithReviews = bookings.map((booking) => {
        const bookingObj = booking.toObject();
        bookingObj.review = reviewMap[booking._id.toString()] || null;
        return bookingObj;
    });

    res.status(200).json(
        new ApiResponse(
            200,
            bookingsWithReviews,
            'User bookings fetched successfully.'
        )
    );
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
    const { bookingId } = req.params; // This can be a bookingId or a reservationId

    let item = await Booking.findOne({ bookingId })
        .populate('user', 'fullName email phone')
        .populate('bookedBy', 'fullName email phone')
        .populate('hall', 'name fullAddress location directionUrl')
        .populate('selectedFacilities.facility');

    let message = "Booking details fetched.";

    if (!item) {
        item = await Reservation.findOne({ reservationId: bookingId })
            .populate('user', 'fullName email phone')
            .populate('reservedBy', 'fullName email phone')
            .populate('hall', 'name fullAddress location directionUrl')
            .populate('selectedFacilities.facility');
        message = "Reservation details fetched.";
    }

    if (!item) {
        throw new ApiError(404, "Booking or Reservation not found");
    }

    // Authorization check
    if (req.user.activeRole === 'user') {
        const userId = req.user._id.toString();
        const entityUserId = item.user ? item.user._id.toString() : null;

        // A user can only see their own bookings/reservations.
        if (entityUserId !== userId) {
            throw new ApiError(403, "You are not authorized to view this item.");
        }
    }
    // Hall owners, staff, and super-admins can view it (as per the route's authorizeRoles middleware)

    const itemObject = item.toObject();

    // Calculate duration for both bookings and reservations as they share the bookingDates structure
    let durationInMilliseconds = 0;
    if (item.bookingDates && item.bookingDates.length > 0) {
      durationInMilliseconds = item.bookingDates.reduce((total, dateRange) => {
        const startTime = new Date(dateRange.startTime);
        const endTime = new Date(dateRange.endTime);
        return total + (endTime.getTime() - startTime.getTime());
      }, 0);
    }
    const durationInHours = durationInMilliseconds / (1000 * 60 * 60);
    itemObject.durationInHours = durationInHours;

    res.status(200).json(new ApiResponse(200, itemObject, message));
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