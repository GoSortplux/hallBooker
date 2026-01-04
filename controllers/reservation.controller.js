import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Booking } from '../models/booking.model.js';
import { Reservation } from '../models/reservation.model.js';
import { Hall } from '../models/hall.model.js';
import { User } from '../models/user.model.js';
import { SubAccount } from '../models/subaccount.model.js';
import Setting from '../models/setting.model.js';
import { calculateBookingPriceAndValidate } from '../utils/booking.utils.js';
import { initializeTransaction, verifyTransaction } from '../services/payment.service.js';
import generateBookingId from '../utils/bookingIdGenerator.js';
import crypto from 'crypto';
import sendEmail from '../services/email.service.js';
import {
    generateNewBookingNotificationEmailForOwner,
    generateReservationConfirmationEmail,
    generateNewReservationNotificationForOwner,
    generatePaymentConfirmationEmail,
    generateNewReservationPendingPaymentEmailForUser
} from '../utils/emailTemplates.js';


export async function processReservationTransaction(transactionData, io) {
    const { paymentStatus, paymentReference, transactionReference } = transactionData;
    const reservationId = paymentReference.split('_')[1];

    const reservation = await Reservation.findById(reservationId).populate('hall').populate('user');
    if (!reservation) {
        console.error(`Reservation with ID ${reservationId} not found.`);
        return;
    }
    if (reservation.paymentStatus === 'paid') return;

    if (paymentStatus === 'PAID') {
        reservation.paymentStatus = 'paid';
        reservation.transactionReference = transactionReference;
        await reservation.save();

        const customer = reservation.reservationType === 'walk-in' ? reservation.walkInUserDetails : reservation.user;
        const hallOwner = await User.findById(reservation.hall.owner);
        const admins = await User.find({ role: 'super-admin' });

        if (customer && customer.email) {
            sendEmail({
                io, email: customer.email, subject: `Your Reservation for ${reservation.hall.name} is Confirmed!`,
                html: generateReservationConfirmationEmail(customer.fullName, reservation),
                notification: { recipient: reservation.user?._id.toString(), message: `Your reservation for ${reservation.hall.name} is confirmed.`, link: `/reservations/${reservation._id}` }
            }).catch(console.error);
        }
        if (hallOwner) {
            sendEmail({
                io, email: hallOwner.email, subject: `New Reservation for Your Hall: ${reservation.hall.name}`,
                html: generateNewReservationNotificationForOwner(hallOwner, customer, reservation),
                notification: { recipient: hallOwner._id.toString(), message: `A new reservation has been made for your hall: ${reservation.hall.name}.`, link: `/hall-owner/reservations/${reservation._id}` }
            }).catch(console.error);
        }
        admins.forEach(admin => {
            sendEmail({
                io, email: admin.email, subject: `Admin Alert: New Reservation Made for ${reservation.hall.name}`,
                html: generateNewReservationNotificationForOwner(admin, customer, reservation),
                notification: { recipient: admin._id.toString(), message: `A new reservation was made for ${reservation.hall.name}.`, link: `/admin/reservations/${reservation._id}` }
            }).catch(console.error);
        });
    } else {
        await Reservation.findByIdAndDelete(reservationId);
        console.log(`Temporary reservation ${reservationId} deleted due to failed/cancelled payment.`);
    }
}

async function finalizeConversion(reservation, paymentDetails, io) {
    const newBookingId = await generateBookingId(reservation.hall.name);

    const newBooking = await Booking.create({
        bookingId: newBookingId,
        hall: reservation.hall._id,
        user: reservation.user,
        eventDetails: reservation.eventDetails,
        bookingDates: reservation.bookingDates,
        totalPrice: reservation.totalPrice,
        hallPrice: reservation.hallPrice,
        facilitiesPrice: reservation.facilitiesPrice,
        paymentMethod: paymentDetails.paymentMethod,
        paymentStatus: 'paid',
        status: 'confirmed',
        bookingType: reservation.reservationType,
        bookedBy: reservation.reservedBy,
        walkInUserDetails: reservation.walkInUserDetails,
        selectedFacilities: reservation.selectedFacilities,
    });

    reservation.status = 'CONVERTED';
    await reservation.save();

    const customer = newBooking.bookingType === 'walk-in' ? newBooking.walkInUserDetails : await User.findById(newBooking.user);
    const hallOwner = await User.findById(reservation.hall.owner);
    const admins = await User.find({ role: 'super-admin' });

    if (customer && customer.email) {
        sendEmail({
            io, email: customer.email, subject: `Your Booking for ${reservation.hall.name} is Confirmed!`,
            html: generatePaymentConfirmationEmail({ ...newBooking.toObject(), hall: reservation.hall, user: customer }),
            notification: { recipient: newBooking.user?._id.toString(), message: `Your booking for ${reservation.hall.name} is confirmed.`, link: `/bookings/${newBooking._id}` }
        }).catch(console.error);
    }

    const notificationHtml = generateNewBookingNotificationEmailForOwner(hallOwner, customer, { ...newBooking.toObject(), hall: reservation.hall });
    if (hallOwner) {
        sendEmail({
            io, email: hallOwner.email, subject: `Booking Confirmed for Your Hall: ${reservation.hall.name}`,
            html: notificationHtml,
            notification: { recipient: hallOwner._id.toString(), message: `A booking has been confirmed for your hall: ${reservation.hall.name}.`, link: `/hall-owner/bookings/${newBooking._id}` }
        }).catch(console.error);
    }
    admins.forEach(admin => {
        sendEmail({
            io, email: admin.email, subject: `Admin Alert: Booking Confirmed for ${reservation.hall.name}`,
            html: notificationHtml,
            notification: { recipient: admin._id.toString(), message: `A booking was confirmed for ${reservation.hall.name}.`, link: `/admin/bookings/${newBooking._id}` }
        }).catch(console.error);
    });

    return newBooking;
}

export async function processConversionTransaction(transactionData, io) {
    const { paymentStatus, paymentReference, paymentMethod } = transactionData;
    const reservationId = paymentReference.split('_')[1];

    const reservation = await Reservation.findById(reservationId).populate('hall');
    if (!reservation) {
        console.error(`Reservation ${reservationId} not found for conversion.`);
        return;
    }
    if (reservation.status === 'CONVERTED') return;

    if (paymentStatus === 'PAID') {
        // Ensure paymentMethod from the transaction is passed to the final booking
        await finalizeConversion(reservation, { paymentMethod: paymentMethod || 'online' }, io);
    }
}


const createReservation = asyncHandler(async (req, res) => {
  const { hallId, bookingDates, eventDetails, selectedFacilities: selectedFacilitiesData, walkInUserDetails } = req.body;
  const user = req.user;

  const isWalkIn = walkInUserDetails && walkInUserDetails.fullName && walkInUserDetails.phone;
  if (!user && !isWalkIn) throw new ApiError(401, 'User must be logged in or walk-in details must be provided.');
  if (isWalkIn && !['super-admin', 'hall-owner', 'staff'].includes(user.activeRole)) throw new ApiError(403, 'You are not authorized to create a walk-in reservation.');

  const hall = await Hall.findById(hallId).populate('facilities.facility');
  if (!hall) throw new ApiError(404, 'Hall not found');

  const bufferMilliseconds = (hall.bookingBufferInHours || 0) * 60 * 60 * 1000;
  const orQuery = bookingDates.map(date => {
    const startTime = new Date(date.startTime), endTime = new Date(date.endTime);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || startTime >= endTime || startTime < new Date()) throw new ApiError(400, 'Invalid or past date provided.');
    const bufferedStartTime = new Date(startTime.getTime() - bufferMilliseconds), bufferedEndTime = new Date(endTime.getTime() + bufferMilliseconds);
    return { 'bookingDates.startTime': { $lt: bufferedEndTime }, 'bookingDates.endTime': { $gt: bufferedStartTime } };
  });

  const bookingConflictQuery = {
    hall: hallId,
    $and: [
      { $or: orQuery },
      { $or: [{ status: 'confirmed' }, { paymentStatus: 'pending' }] }
    ]
  };
  if (await Booking.findOne(bookingConflictQuery)) throw new ApiError(409, "Time slot conflicts with a booking.");

  const reservationConflictQuery = {
    hall: hallId,
    $or: orQuery,
    status: 'ACTIVE',
    paymentStatus: 'paid'
  };
  if (await Reservation.findOne(reservationConflictQuery)) throw new ApiError(409, "Time slot conflicts with a reservation.");

  const facilitiesToPrice = selectedFacilitiesData?.map(sf => {
    const hallFacility = hall.facilities.find(f => f.facility._id.toString() === sf.facilityId);
    if (!hallFacility) throw new ApiError(404, `Facility with ID ${sf.facilityId} not found.`);
    return { ...hallFacility.toObject(), requestedQuantity: sf.quantity };
  }) || [];

  const { totalPrice, hallPrice, facilitiesPrice, facilitiesWithCalculatedCosts } = calculateBookingPriceAndValidate(bookingDates, hall.pricing, facilitiesToPrice);
  const reservationFee = parseFloat((totalPrice * (hall.reservationFeePercentage / 100)).toFixed(2));
  const reservationId = await generateBookingId(hall.name);

  const tempReservation = new Reservation({
      reservationId: `RES-${reservationId}`,
      hall: hallId, user: isWalkIn ? null : user._id, reservedBy: user._id, bookingDates, eventDetails, totalPrice, hallPrice, facilitiesPrice, reservationFee,
      paymentStatus: 'pending', status: 'ACTIVE', reservationType: isWalkIn ? 'walk-in' : 'online', walkInUserDetails: isWalkIn ? walkInUserDetails : undefined,
      selectedFacilities: facilitiesWithCalculatedCosts.map((cf, i) => ({ ...cf, facility: selectedFacilitiesData[i].facilityId })),
      cutoffDate: new Date(new Date(bookingDates[0].startTime).getTime() - (hall.reservationCutoffHours * 60 * 60 * 1000)),
  });

  const uniquePaymentReference = `RES_${tempReservation._id}_${crypto.randomBytes(6).toString('hex')}`;
  tempReservation.paymentReference = uniquePaymentReference;
  const newReservation = await tempReservation.save();

  // --- Send Notifications ---
  try {
    const customer = isWalkIn ? walkInUserDetails : user;
    const hallOwner = await User.findById(hall.owner);
    const admins = await User.find({ role: 'super-admin' });
    const io = req.app.get('io');

    // Combine the new reservation with the populated hall for email templates
    const reservationForEmail = { ...newReservation.toObject(), hall };

    // Notify customer
    if (customer && customer.email) {
      sendEmail({
        io,
        email: customer.email,
        subject: `Your Reservation for ${hall.name} is Pending Payment`,
        html: generateNewReservationPendingPaymentEmailForUser(customer.fullName, reservationForEmail),
        notification: {
          recipient: user?._id.toString(),
          message: `Your reservation for ${hall.name} is pending payment.`,
          link: `/reservations/${newReservation._id}`,
        },
      });
    }

    // Notify hall owner
    if (hallOwner) {
      sendEmail({
        io,
        email: hallOwner.email,
        subject: `New Reservation Pending for ${hall.name}`,
        html: generateNewReservationNotificationForOwner(hallOwner, customer, reservationForEmail),
        notification: {
          recipient: hallOwner._id.toString(),
          message: `A new reservation for your hall ${hall.name} is awaiting payment.`,
          link: `/hall-owner/reservations/${newReservation._id}`,
        },
      });
    }

    // Notify admins
    admins.forEach(admin => {
      sendEmail({
        io,
        email: admin.email,
        subject: `Admin Alert: New Reservation Pending for ${hall.name}`,
        html: generateNewReservationNotificationForOwner(admin, customer, reservationForEmail),
        notification: {
          recipient: admin._id.toString(),
          message: `A new reservation for ${hall.name} is pending payment.`,
          link: `/admin/reservations/${newReservation._id}`,
        },
      });
    });
  } catch (error) {
    console.error('Failed to send reservation creation notifications:', error);
    // Do not throw an error, as the reservation itself was successful.
  }

  res.status(201).json(new ApiResponse(201, newReservation, 'Reservation created successfully. Pending payment.'));
});

const verifyReservationPayment = asyncHandler(async (req, res) => {
    const { paymentReference } = req.query;
    if (!paymentReference) throw new ApiError(400, 'Payment reference is required.');

    try {
        const { responseBody: transaction } = await verifyTransaction(paymentReference);
        await processReservationTransaction(transaction, req.app.get('io'));
        const status = transaction.paymentStatus === 'PAID' ? 'success' : 'failed';
        res.status(200).json(new ApiResponse(200, { status, type: 'reservation' }, 'Payment verification complete.'));
    } catch (error) {
        console.error("Payment verification failed:", error);
        throw new ApiError(500, 'Payment verification failed.');
    }
});

const convertReservation = asyncHandler(async (req, res) => {
    const { reservationId } = req.params;
    const { paymentMethod } = req.body;
    const user = req.user;

    const reservation = await Reservation.findOne({ reservationId }).populate('hall');
    if (!reservation) throw new ApiError(404, 'Reservation not found.');
    if (reservation.status !== 'ACTIVE' || reservation.paymentStatus !== 'paid') throw new ApiError(400, 'This reservation is not active or its fee has not been paid.');
    if (new Date() > new Date(reservation.cutoffDate)) {
        reservation.status = 'EXPIRED';
        await reservation.save();
        throw new ApiError(400, 'This reservation has passed its cutoff date and has expired.');
    }

    const remainingBalance = reservation.totalPrice - reservation.reservationFee;
    if (remainingBalance <= 0) {
        const newBooking = await finalizeConversion(reservation, { paymentMethod: 'online' }, req.app.get('io'));
        return res.status(201).json(new ApiResponse(201, newBooking, 'Reservation converted to booking with no balance remaining.'));
    }

    const isAuthorizedOfflinePayment = ['super-admin', 'hall-owner', 'staff'].includes(user.activeRole) && paymentMethod && paymentMethod !== 'online';
    if (isAuthorizedOfflinePayment) {
        const newBooking = await finalizeConversion(reservation, { paymentMethod }, req.app.get('io'));
        return res.status(201).json(new ApiResponse(201, newBooking, 'Reservation converted to booking successfully via offline payment.'));
    }

    const customer = reservation.reservationType === 'walk-in' ? reservation.walkInUserDetails : await User.findById(reservation.user);
    if (!customer) throw new ApiError(404, 'Customer details could not be found for this reservation.');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/payment/verify`;
    const uniquePaymentReference = `CONV_${reservation._id}_${crypto.randomBytes(6).toString('hex')}`;

    const transactionData = {
        amount: remainingBalance,
        customerName: customer.fullName,
        customerEmail: customer.email,
        paymentReference: uniquePaymentReference,
        paymentDescription: `Booking balance for ${reservation.hall.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"],
        redirectUrl,
        metadata: { reservationId: reservation._id.toString() },
    };

    const paymentResponse = await initializeTransaction(transactionData);
    res.status(200).json(new ApiResponse(200, paymentResponse.responseBody, 'Conversion payment initiated.'));
});

const verifyConversionPayment = asyncHandler(async (req, res) => {
    const { paymentReference } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!paymentReference) throw new ApiError(400, 'Payment reference is required.');

    try {
        const { responseBody: transaction } = await verifyTransaction(paymentReference);
        await processConversionTransaction(transaction, req.app.get('io'));
        res.redirect(`${frontendUrl}/payment/${transaction.paymentStatus === 'PAID' ? 'success' : 'failed'}?type=booking`);
    } catch (error) {
        console.error("Conversion payment verification failed:", error);
        res.redirect(`${frontendUrl}/payment/failed?type=booking&error=verification_failed`);
    }
});

const getReservationsForHall = asyncHandler(async (req, res) => {
    const { hallId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { hall: hallId };
    if (status) {
        query.status = status.toUpperCase();
    }

    const reservations = await Reservation.find(query)
        .populate('user', 'fullName email')
        .populate('reservedBy', 'fullName email')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

    const count = await Reservation.countDocuments(query);

    res.status(200).json(new ApiResponse(200, {
        reservations,
        totalPages: Math.ceil(count / limit),
        currentPage: page
    }, "Reservations fetched successfully."));
});

const getReservationById = asyncHandler(async (req, res) => {
    const { reservationId } = req.params;

    const reservation = await Reservation.findById(reservationId)
        .populate({
            path: 'hall',
            select: 'name location owner staff', // Select all fields needed for auth and response
        })
        .populate('user', 'fullName email')
        .populate('reservedBy', 'fullName email');

    if (!reservation) {
        throw new ApiError(404, 'Reservation not found.');
    }

    const isOwnerOrStaff = reservation.hall.owner.equals(req.user._id) || reservation.hall.staff.some(staffId => staffId.equals(req.user._id));
    const isUserWhoReserved = reservation.user && reservation.user._id.equals(req.user._id);
    const isSuperAdmin = req.user.activeRole === 'super-admin';

    if (!isOwnerOrStaff && !isUserWhoReserved && !isSuperAdmin) {
        throw new ApiError(403, 'You are not authorized to view this reservation.');
    }

    res.status(200).json(new ApiResponse(200, reservation, "Reservation details fetched."));
});

export {
    createReservation,
    verifyReservationPayment,
    convertReservation,
    verifyConversionPayment,
    getReservationsForHall,
    getReservationById
};
