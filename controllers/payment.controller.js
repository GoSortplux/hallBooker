import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { initializeTransaction, verifyTransaction } from '../services/payment.service.js';
import { Booking } from '../models/booking.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { Hall } from '../models/hall.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import Setting from '../models/setting.model.js';
import { SubAccount } from '../models/subaccount.model.js';
import { Disbursement } from '../models/disbursement.model.js';
import sendEmail from '../services/email.service.js';
import {
    generateAdminDisbursementFailureEmail,
    generateMandateCancellationEmail,
    generateBookingConfirmationEmail,
    generateSubscriptionConfirmationEmail,
    generateAdminLicenseNotificationEmail,
    generateSubscriptionPaymentEmail,
    generatePaymentConfirmationEmail,
    generateRecurringBookingConfirmationEmail,
    generateNewBookingNotificationEmailForOwner
} from '../utils/emailTemplates.js';
import { generatePdfReceipt, generateSubscriptionPdfReceipt } from '../utils/pdfGenerator.js';
import { processReservationTransaction, processConversionTransaction } from './reservation.controller.js';


// Helper function to parse Monnify's custom date format
const parseMonnifyDate = (dateString) => {
    if (!dateString) return null;

    // Monnify format: "17/03/2021 3:23:38 AM"
    const parts = dateString.split(' ');
    if (parts.length < 3) return new Date(dateString); // Fallback for standard formats

    const dateParts = parts[0].split('/'); // [dd, mm, yyyy]
    const timeParts = parts[1].split(':'); // [hh, mm, ss]
    const ampm = parts[2].toUpperCase();

    if (dateParts.length < 3 || timeParts.length < 3) return new Date(dateString);

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(dateParts[2], 10);

    let hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const second = parseInt(timeParts[2], 10);

    if (ampm === 'PM' && hour < 12) {
        hour += 12;
    }
    if (ampm === 'AM' && hour === 12) { // Midnight case (12 AM is 00 hours)
        hour = 0;
    }

    return new Date(Date.UTC(year, month, day, hour, minute, second));
};


// ---------------------- SUBSCRIPTION PROCESSING ----------------------

async function processTransaction(transactionData, io) {
    const { paymentStatus, paymentReference: refFromMonnify, transactionReference, paymentMethod } = transactionData;

    const subscription = await SubscriptionHistory.findById(refFromMonnify)
        .populate('owner')
        .populate('tier');

    if (!subscription) {
        console.log(`No matching subscription found for payment reference: ${refFromMonnify}`);
        return;
    }

    if (subscription.status !== 'pending') {
        console.log(`Subscription ${subscription._id} already processed. Status: ${subscription.status}`);
        return;
    }

    const admin = await User.findOne({ role: 'super-admin' });

    switch (paymentStatus) {
        case 'PAID':
            subscription.status = 'active';
            subscription.transactionReference = transactionReference;
            subscription.paymentReference = refFromMonnify;
            subscription.paymentMethod = paymentMethod;

            if (subscription.tier.durationInDays) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + subscription.tier.durationInDays);
                subscription.expiryDate = expiryDate;
            }

            await subscription.save();
            await Hall.updateMany({ owner: subscription.owner._id }, { $set: { isActive: true } });

            try {
                const pdfBuffer = Buffer.from(generateSubscriptionPdfReceipt(subscription));

                await sendEmail({
                    io,
                    email: subscription.owner.email,
                    subject: 'Your Subscription Payment Receipt',
                    html: generateSubscriptionPaymentEmail(subscription),
                    attachments: [
                        { filename: `receipt-${subscription._id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }
                    ],
                });

                await sendEmail({
                    io,
                    email: subscription.owner.email,
                    subject: 'Your Subscription is Confirmed!',
                    html: generateSubscriptionConfirmationEmail(
                        subscription.owner.fullName,
                        subscription.tier.name,
                        subscription.price,
                        subscription.expiryDate
                    ),
                });

                if (admin) {
                    await sendEmail({
                        io,
                        email: admin.email,
                        subject: 'New Subscription Purchase',
                        html: generateAdminLicenseNotificationEmail(
                            subscription.owner.fullName,
                            subscription.tier.name,
                            subscription.price
                        ),
                    });
                }
            } catch (error) {
                console.error("Email sending failed:", error);
            }
            break;

        case 'FAILED':
            subscription.status = 'failed';
            await subscription.save();
            break;

        case 'CANCELLED':
            subscription.status = 'cancelled';
            await subscription.save();
            break;
    }
}


// ---------------------- BOOKING PROCESSING (KEEP THIS) ----------------------

async function processBookingTransaction(bookingDetails, io) {
    const { paymentStatus, paymentReference: refFromMonnify, paymentMethod } = bookingDetails;

    if (refFromMonnify.startsWith('RES_')) {
        await processReservationTransaction(bookingDetails, io);
    } else if (refFromMonnify.startsWith('CONV_')) {
        await processConversionTransaction(bookingDetails, io);
    } else if (refFromMonnify.startsWith('RECURRING_')) {
        const recurringBookingId = refFromMonnify.split('_')[1];
        if (paymentStatus === 'PAID') {
            const bookings = await Booking.find({ recurringBookingId }).populate({
                path: 'hall',
                populate: { path: 'owner' }
            });

            if (!bookings.length || bookings[0].paymentStatus === 'paid') {
                console.log(`Recurring booking ${recurringBookingId} already processed or not found.`);
                return;
            }

            await Booking.updateMany({ recurringBookingId }, { $set: { paymentStatus: 'paid', paymentMethod } });

            const hall = bookings[0].hall;
            const customer = bookings[0].walkInUserDetails;
            const hallOwner = hall.owner;
            const admins = await User.find({ role: 'super-admin' });

            // Send email to customer
            if (customer.email) {
                sendEmail({
                    io,
                    email: customer.email,
                    subject: `Your Recurring Booking for ${hall.name} is Confirmed!`,
                    html: generateRecurringBookingConfirmationEmail(customer.fullName, bookings, hall),
                }).catch(err => console.error("Recurring booking email error:", err));
            }

            // Notify hall owner
            sendEmail({
                io,
                email: hallOwner.email,
                subject: `New Recurring Booking for ${hall.name}`,
                html: generateRecurringBookingConfirmationEmail(hallOwner.fullName, bookings, hall),
                notification: {
                    recipient: hallOwner._id.toString(),
                    message: `A new recurring booking has been confirmed for ${hall.name}.`,
                    link: `/hall-owner/bookings?recurringId=${recurringBookingId}`,
                },
            }).catch(err => console.error("Recurring booking notification error for owner:", err));

            // Notify admins
            admins.forEach(admin => {
                sendEmail({
                    io,
                    email: admin.email,
                    subject: `Admin Alert: New Recurring Booking for ${hall.name}`,
                    html: generateRecurringBookingConfirmationEmail(admin.fullName, bookings, hall),
                    notification: {
                        recipient: admin._id.toString(),
                        message: `A recurring booking was made for ${hall.name} by ${hallOwner.fullName}.`,
                        link: `/admin/bookings?recurringId=${recurringBookingId}`,
                    },
                }).catch(err => console.error("Recurring booking notification error for admin:", err));
            });
        }
    } else {
        const bookingIdFromRef = refFromMonnify.split('_')[0];
        const booking = await Booking.findOne({ bookingId: bookingIdFromRef });

        if (!booking) {
            console.log(`No matching booking found for ${refFromMonnify}`);
            return;
        }
        if (booking.paymentStatus === 'paid') {
            console.log(`Booking ${bookingIdFromRef} already paid.`);
            return;
        }

        if (paymentStatus === 'PAID') {
            booking.paymentStatus = 'paid';
            booking.paymentMethod = paymentMethod;
            await booking.save();

            const confirmedBooking = await Booking.findById(booking._id)
                .populate('user')
                .populate({
                    path: 'hall',
                    populate: { path: 'owner' }
                });

            const hallOwner = confirmedBooking.hall.owner;
            const admins = await User.find({ role: 'super-admin' });
            let customerEmail;
            let customerDetails;

            if (confirmedBooking.bookingType === 'walk-in') {
                customerEmail = confirmedBooking.walkInUserDetails.email;
                customerDetails = confirmedBooking.walkInUserDetails;
            } else {
                customerEmail = confirmedBooking.user.email;
                customerDetails = confirmedBooking.user;
            }

            if (customerEmail) {
                const bookingForEmail = { ...confirmedBooking.toObject(), user: customerDetails };
                const pdfBuffer = Buffer.from(generatePdfReceipt(bookingForEmail));
                sendEmail({
                    io,
                    email: customerEmail,
                    subject: 'Payment Confirmation and Receipt',
                    html: generatePaymentConfirmationEmail(bookingForEmail),
                    attachments: [{ filename: `receipt-${bookingForEmail.bookingId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
                    notification: {
                        recipient: confirmedBooking.user?._id?.toString(),
                        message: `Your booking #${confirmedBooking.bookingId} has been confirmed.`,
                        link: `/bookings/${confirmedBooking._id}`,
                    },
                }).catch(err => console.error("Email error:", err));
            }

            // Notify hall owner
            sendEmail({
                io,
                email: hallOwner.email,
                subject: `Booking Payment Received for ${confirmedBooking.hall.name}`,
                html: generateNewBookingNotificationEmailForOwner(hallOwner, customerDetails, confirmedBooking),
                notification: {
                    recipient: hallOwner._id.toString(),
                    message: `Payment for booking #${confirmedBooking.bookingId} has been confirmed.`,
                    link: `/hall-owner/bookings/${confirmedBooking._id}`,
                },
            }).catch(err => console.error("Owner notification error:", err));

            // Notify admins
            admins.forEach(admin => {
                sendEmail({
                    io,
                    email: admin.email,
                    subject: `Admin Alert: Booking Payment Received for ${confirmedBooking.hall.name}`,
                    html: generateNewBookingNotificationEmailForOwner(admin, customerDetails, confirmedBooking),
                    notification: {
                        recipient: admin._id.toString(),
                        message: `Payment confirmed for booking #${confirmedBooking.bookingId} at ${confirmedBooking.hall.name}.`,
                        link: `/admin/bookings/${confirmedBooking._id}`,
                    },
                }).catch(err => console.error("Admin notification error:", err));
            });
        }
    }
}


// ---------------------- PAYMENT INITIALIZATION ----------------------

const makePayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId }).populate({
        path: 'hall',
        select: 'name owner',
        populate: {
            path: 'owner',
            select: '_id',
        },
    });

    if (!booking) throw new ApiError(404, 'Booking not found');

    if (booking.paymentStatus === 'paid') {
        throw new ApiError(400, 'Payment has already been made for this booking.');
    }

    if (booking.bookingType !== 'walk-in' && !req.user)
        throw new ApiError(401, 'Login required');

    const hallOwner = booking.hall.owner;
    const ownerSubAccount = await SubAccount.findOne({ user: hallOwner._id });

    const commissionSetting = await Setting.findOne({ key: 'platformCommissionPercentage' });

    const subaccounts = [];
    if (ownerSubAccount) {
        const commissionPercentage = commissionSetting ? parseFloat(commissionSetting.value) : 0;

        if (commissionPercentage > 0 && commissionPercentage < 100) {
            const netAmount = booking.totalPrice * (1 - commissionPercentage / 100);

            subaccounts.push({
                subAccountCode: ownerSubAccount.subAccountCode,
                splitAmount: parseFloat(netAmount.toFixed(2)),
            });
        }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/payment/verify`;
    const uniquePaymentReference = `${bookingId}_${Date.now()}`;

    const data = {
        amount: booking.totalPrice,
        customerName: booking.bookingType === 'walk-in'
            ? booking.walkInUserDetails.fullName
            : req.user.fullName,
        customerEmail: booking.bookingType === 'walk-in'
            ? booking.walkInUserDetails.email
            : req.user.email,
        paymentReference: uniquePaymentReference,
        paymentDescription: `Payment for booking of ${booking.hall.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"],
        redirectUrl,
    };

    if (subaccounts.length > 0) {
        data.subaccounts = subaccounts;
    }

    const response = await initializeTransaction(data);
    res.status(200).json(new ApiResponse(200, response.responseBody, 'Transaction initialized'));
});


// ---------------------- VERIFY PAYMENT ----------------------

const verifyPayment = asyncHandler(async (req, res) => {
    const { paymentReference } = req.query;

    const response = await verifyTransaction(paymentReference);
    const transaction = response.responseBody;

    const isBookingPayment = transaction.paymentReference.includes('_');

    if (isBookingPayment) {
        await processBookingTransaction(transaction, req.app.get('io'));
    } else {
        await processTransaction(transaction, req.app.get('io'));
    }

    return res.status(200).json(
        new ApiResponse(200, { status: transaction.paymentStatus, type: isBookingPayment ? 'booking' : 'subscription' }, 'Verification complete')
    );
});


// ---------------------- HANDLE WEBHOOK ----------------------

const handleMonnifyWebhook = asyncHandler(async (req, res) => {
    const { eventType, eventData } = req.body;
    const io = req.app.get('io');

    switch (eventType) {
        case 'SUCCESSFUL_TRANSACTION': {
            const response = await verifyTransaction(eventData.paymentReference);
            const transaction = response.responseBody;
            const isBookingPayment = transaction.paymentReference.includes('_');

            if (isBookingPayment) {
                await processBookingTransaction(transaction, io);
            } else {
                await processTransaction(transaction, io);
            }
            break;
        }

        case 'SUCCESSFUL_DISBURSEMENT': {
            const parsedData = {
                ...eventData,
                completedOn: parseMonnifyDate(eventData.completedOn),
                status: 'SUCCESS',
            };
            await Disbursement.create(parsedData);
            break;
        }

        case 'FAILED_DISBURSEMENT': {
            const parsedData = {
                ...eventData,
                completedOn: parseMonnifyDate(eventData.completedOn),
                status: 'FAILED',
            };
            await Disbursement.create(parsedData);
            const admin = await User.findOne({ role: 'super-admin' });
            if (admin) {
                await sendEmail({
                    io,
                    email: admin.email,
                    subject: 'Disbursement Failure Alert',
                    html: generateAdminDisbursementFailureEmail(parsedData),
                });
            }
            break;
        }

        case 'MANDATE_UPDATE': {
            if (eventData.mandateStatus === 'CANCELLED') {
                const subscription = await SubscriptionHistory.findOne({ mandateCode: eventData.mandateCode }).populate('owner');
                if (subscription) {
                    subscription.mandateStatus = 'CANCELLED';
                    await subscription.save();

                    await sendEmail({
                        io,
                        email: subscription.owner.email,
                        subject: 'Your Subscription Auto-Renewal Was Cancelled',
                        html: generateMandateCancellationEmail(subscription.owner.fullName, subscription.expiryDate),
                    });
                }
            }
            break;
        }

        default:
            console.log(`Received unhandled event type: ${eventType}`);
            break;
    }

    res.status(200).json(new ApiResponse(200, null, 'Webhook processed'));
});


const makePaymentForRecurring = asyncHandler(async (req, res) => {
    const { recurringBookingId } = req.params;

    const bookings = await Booking.find({ recurringBookingId }).populate('hall', 'name');
    if (!bookings || bookings.length === 0) {
        throw new ApiError(404, 'No bookings found for this recurring ID.');
    }

    const totalAmount = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);
    const firstBooking = bookings[0];

    if (firstBooking.paymentStatus === 'paid') {
        throw new ApiError(400, 'Payment has already been made for this booking.');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/payment/verify`;
    const uniquePaymentReference = `RECURRING_${recurringBookingId}_${Date.now()}`;

    const data = {
        amount: totalAmount,
        customerName: firstBooking.walkInUserDetails.fullName,
        customerEmail: firstBooking.walkInUserDetails.email,
        paymentReference: uniquePaymentReference,
        paymentDescription: `Payment for recurring booking at ${firstBooking.hall.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"],
        redirectUrl,
    };

    const response = await initializeTransaction(data);
    res.status(200).json(new ApiResponse(200, response.responseBody, 'Recurring payment transaction initialized'));
});

const makePaymentForReservation = asyncHandler(async (req, res) => {
    const { reservationId } = req.params;

    const reservation = await Reservation.findOne({ reservationId }).populate('hall', 'name');
    if (!reservation) throw new ApiError(404, 'Reservation not found');
    if (reservation.paymentStatus === 'paid') throw new ApiError(400, 'Reservation fee has already been paid.');

    const customer = reservation.reservationType === 'walk-in' ? reservation.walkInUserDetails : await User.findById(reservation.user);
    if (!customer) throw new ApiError(404, 'Customer details not found for this reservation.');

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/payment/verify`;

    const transactionData = {
        amount: reservation.reservationFee,
        customerName: customer.fullName,
        customerEmail: customer.email,
        paymentReference: reservation.paymentReference,
        paymentDescription: `Reservation fee for ${reservation.hall.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"],
        redirectUrl,
    };

    const response = await initializeTransaction(transactionData);
    res.status(200).json(new ApiResponse(200, response.responseBody, 'Reservation payment transaction initialized'));
});


export { makePayment, makePaymentForRecurring, makePaymentForReservation, verifyPayment, handleMonnifyWebhook };
