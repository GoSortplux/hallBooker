import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { initializeTransaction, verifyTransaction } from '../services/payment.service.js';
import { Booking } from '../models/booking.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { Venue } from '../models/venue.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import Setting from '../models/setting.model.js';
import { SubAccount } from '../models/subaccount.model.js';
import sendEmail from '../services/email.service.js';
import {
    generateBookingConfirmationEmail,
    generateSubscriptionConfirmationEmail,
    generateAdminLicenseNotificationEmail,
    generateSubscriptionPaymentEmail
} from '../utils/emailTemplates.js';
import { generatePaymentConfirmationEmail } from '../utils/emailTemplates.js';
import { generatePdfReceipt, generateSubscriptionPdfReceipt } from '../utils/pdfGenerator.js';

const makePayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).populate({
        path: 'venue',
        select: 'name owner',
        populate: {
            path: 'owner',
            select: '_id'
        }
    });

    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }

    if (booking.paymentMethod === 'walk-in' || booking.bookingType === 'walk-in') {
        throw new ApiError(400, 'This endpoint is for online payments only.');
    }

    if (!process.env.MONNIFY_CONTRACT_CODE) {
        throw new ApiError(500, 'MONNIFY_CONTRACT_CODE is not defined in environment variables.');
    }

    const redirectUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/bookings`
        : `${req.protocol}://${req.get('host')}/api/v1/payments/verify`;

    const uniquePaymentReference = `${bookingId}_${Date.now()}`;

    const data = {
        amount: booking.totalPrice,
        customerName: req.user.fullName,
        customerEmail: req.user.email,
        paymentReference: uniquePaymentReference,
        paymentDescription: `Payment for booking of ${booking.venue.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
        redirectUrl: redirectUrl,
    };

    const commissionSetting = await Setting.findOne({ key: 'commissionRate' });
    if (commissionSetting && commissionSetting.value > 0) {
        const venueOwnerId = booking.venue.owner._id;
        const subAccount = await SubAccount.findOne({ user: venueOwnerId });

        if (subAccount) {
            const commissionRate = commissionSetting.value / 100; // e.g., 5% -> 0.05
            const splitPercentage = (1 - commissionRate) * 100; // e.g., 95

            data.incomeSplitConfig = [{
                subAccountCode: subAccount.subAccountCode,
                feePercentage: 0, // Merchant bears transaction fees
                splitPercentage: splitPercentage,
                feeBearer: false
            }];
        } else {
            console.log(`No sub-account found for venue owner ${venueOwnerId}. Proceeding without split.`);
        }
    }

    const response = await initializeTransaction(data);

    res.status(200).json(new ApiResponse(200, response.responseBody, 'Transaction initialized successfully'));
});

const verifyPayment = asyncHandler(async (req, res) => {
    const { paymentReference } = req.query;

    if (!paymentReference) {
        throw new ApiError(400, 'Payment reference is required');
    }

    const response = await verifyTransaction(paymentReference);
    const paymentStatus = response.responseBody.paymentStatus;

    if (paymentStatus !== 'PAID') {
        // Redirect to a failure page or handle accordingly
        return res.redirect(`${process.env.FRONTEND_URL}/payment-failed`);
    }

    const { paymentReference: refFromMonnify, transactionReference } = response.responseBody;

    // If the payment reference contains an underscore, it's a booking payment.
    const bookingIdFromRef = refFromMonnify.includes('_') ? refFromMonnify.split('_')[0] : refFromMonnify;


    // Attempt to find a booking first
    const booking = await Booking.findOne({ bookingId: bookingIdFromRef });
    if (booking) {
        if (booking.paymentStatus === 'paid') {
            console.log(`Payment for booking ${bookingIdFromRef} has already been processed.`);
            return res.redirect(`${process.env.FRONTEND_URL}/bookings`);
        }

        booking.paymentStatus = 'paid';
        await booking.save();

        const confirmedBooking = await Booking.findById(booking._id).populate('user').populate('venue');

        if (!confirmedBooking) {
            throw new ApiError(500, "Failed to retrieve confirmed booking details.");
        }

        let emailToSend;
        let userForEmail;

        if (confirmedBooking.bookingType === 'walk-in') {
            emailToSend = confirmedBooking.walkInUserDetails.email;
            userForEmail = { fullName: confirmedBooking.walkInUserDetails.fullName };
        } else {
            emailToSend = confirmedBooking.user.email;
            userForEmail = confirmedBooking.user;
        }

        if (emailToSend) {
            const bookingForEmail = {
                ...confirmedBooking.toObject(),
                user: userForEmail,
            };

            const pdfBuffer = Buffer.from(generatePdfReceipt(bookingForEmail));
            await sendEmail({
                email: emailToSend,
                subject: 'Payment Confirmation and Receipt',
                html: generatePaymentConfirmationEmail(bookingForEmail),
                attachments: [{ filename: `receipt-${bookingForEmail.bookingId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
            });
        }

        return res.redirect(`${process.env.FRONTEND_URL}/bookings`);
    }

    // If not a booking, try to find a subscription
    const subscription = await SubscriptionHistory.findById(refFromMonnify).populate('owner').populate('tier');
    if (subscription && subscription.status === 'pending') {
        // 1. Update subscription details
        subscription.status = 'active';
        subscription.transactionId = transactionReference;
        if (subscription.tier.durationInDays) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + subscription.tier.durationInDays);
            subscription.expiryDate = expiryDate;
        }

        // 2. Save the updated subscription to the database FIRST
        await subscription.save();

        // 3. Activate the user's venues
        await Venue.updateMany({ owner: subscription.owner._id }, { $set: { isActive: true } });

        // 4. Send receipt and confirmation emails (now that the subscription is saved)
        try {
            const pdfBuffer = Buffer.from(generateSubscriptionPdfReceipt(subscription));
            // Send detailed email with receipt
            await sendEmail({
                email: subscription.owner.email,
                subject: 'Your Subscription Payment Receipt',
                html: generateSubscriptionPaymentEmail(subscription),
                attachments: [{ filename: `receipt-${subscription._id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
            });

            // Send simple confirmation email
            await sendEmail({
                email: subscription.owner.email,
                subject: 'Your Subscription is Confirmed!',
                html: generateSubscriptionConfirmationEmail(subscription.owner.fullName, subscription.tier.name, subscription.price, subscription.expiryDate),
            });

            const admin = await User.findOne({ role: 'super-admin' });
            if (admin) {
                await sendEmail({
                    email: admin.email,
                    subject: 'New Subscription Purchase',
                    html: generateAdminLicenseNotificationEmail(subscription.owner.fullName, subscription.tier.name, subscription.price),
                });
            }
        } catch (emailError) {
            // Log the email error, but don't crash the process. The payment was successful.
            console.error('Failed to send subscription confirmation emails:', emailError);
        }

        // 5. Redirect user to their subscription dashboard
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard/subscription`);
    }

    // If neither booking nor subscription is found, or subscription was not pending
    throw new ApiError(404, 'No matching booking or pending subscription found for this payment reference.');
});

export { makePayment, verifyPayment };
