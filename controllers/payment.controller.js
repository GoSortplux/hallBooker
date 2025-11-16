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
import sendEmail from '../services/email.service.js';
import {
    generateBookingConfirmationEmail,
    generateSubscriptionConfirmationEmail,
    generateAdminLicenseNotificationEmail,
    generateSubscriptionPaymentEmail
} from '../utils/emailTemplates.js';
import { generatePaymentConfirmationEmail } from '../utils/emailTemplates.js';
import { generatePdfReceipt, generateSubscriptionPdfReceipt } from '../utils/pdfGenerator.js';

async function processTransaction(transactionData, io) {
    const { paymentStatus, paymentReference: refFromMonnify, transactionReference, paymentMethod } = transactionData;

    // --- Subscription Payment ---
    const subscription = await SubscriptionHistory.findById(refFromMonnify).populate('owner').populate('tier');

    if (!subscription) {
        console.log(`No matching subscription found for payment reference: ${refFromMonnify}`);
        return;
    }

    if (subscription.status !== 'pending') {
        console.log(`Subscription ${subscription._id} is not in 'pending' state. Current state: ${subscription.status}. No action taken.`);
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
                    attachments: [{ filename: `receipt-${subscription._id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
                    notification: { recipient: subscription.owner._id.toString(), message: `Your payment for the ${subscription.tier.name} subscription has been confirmed.` },
                });
                await sendEmail({
                    io,
                    email: subscription.owner.email,
                    subject: 'Your Subscription is Confirmed!',
                    html: generateSubscriptionConfirmationEmail(subscription.owner.fullName, subscription.tier.name, subscription.price, subscription.expiryDate),
                    notification: { recipient: subscription.owner._id.toString(), message: `Your subscription for the ${subscription.tier.name} tier is now active.` },
                });
                if (admin) {
                    await sendEmail({
                        io,
                        email: admin.email,
                        subject: 'New Subscription Purchase',
                        html: generateAdminLicenseNotificationEmail(subscription.owner.fullName, subscription.tier.name, subscription.price),
                        notification: { recipient: admin._id.toString(), message: `${subscription.owner.fullName} has subscribed to the ${subscription.tier.name} tier.` },
                    });
                }
            } catch (emailError) {
                console.error('Failed to send subscription confirmation emails:', emailError);
            }
            break;

        case 'FAILED':
            subscription.status = 'failed';
            await subscription.save();
            // Notify user and admin
            sendEmail({
                io,
                email: subscription.owner.email,
                subject: 'Subscription Payment Failed',
                html: `<p>Hi ${subscription.owner.fullName}, your payment for the ${subscription.tier.name} subscription failed.</p>`,
                notification: { recipient: subscription.owner._id.toString(), message: `Your payment for the ${subscription.tier.name} subscription failed.` },
            }).catch(e => console.error("Failed to send user notification for failed payment:", e));
            if (admin) {
                sendEmail({
                    io,
                    email: admin.email,
                    subject: 'Subscription Payment Failed',
                    html: `<p>A payment by ${subscription.owner.fullName} for the ${subscription.tier.name} subscription has failed.</p>`,
                    notification: { recipient: admin._id.toString(), message: `Payment by ${subscription.owner.fullName} for ${subscription.tier.name} failed.` },
                }).catch(e => console.error("Failed to send admin notification for failed payment:", e));
            }
            break;

        case 'CANCELLED':
            subscription.status = 'cancelled';
            await subscription.save();
             // Notify user and admin
            sendEmail({
                io,
                email: subscription.owner.email,
                subject: 'Subscription Payment Cancelled',
                html: `<p>Hi ${subscription.owner.fullName}, your payment for the ${subscription.tier.name} subscription was cancelled.</p>`,
                notification: { recipient: subscription.owner._id.toString(), message: `Your payment for the ${subscription.tier.name} subscription was cancelled.` },
            }).catch(e => console.error("Failed to send user notification for cancelled payment:", e));
             if (admin) {
                sendEmail({
                    io,
                    email: admin.email,
                    subject: 'Subscription Payment Cancelled',
                    html: `<p>A payment by ${subscription.owner.fullName} for the ${subscription.tier.name} subscription was cancelled.</p>`,
                    notification: { recipient: admin._id.toString(), message: `Payment by ${subscription.owner.fullName} for ${subscription.tier.name} was cancelled.` },
                }).catch(e => console.error("Failed to send admin notification for cancelled payment:", e));
            }
            break;
    }
}

async function processBookingTransaction(bookingDetails, io) {
    const { paymentStatus, paymentReference: refFromMonnify } = bookingDetails;
    const bookingIdFromRef = refFromMonnify.split('_')[0];
    const booking = await Booking.findOne({ bookingId: bookingIdFromRef });

    if (!booking) {
        console.log(`No matching booking found for payment reference: ${refFromMonnify}`);
        return;
    }

    if (booking.paymentStatus === 'paid') {
        console.log(`Payment for booking ${bookingIdFromRef} has already been processed.`);
        return;
    }

    if (paymentStatus === 'PAID') {
        booking.paymentStatus = 'paid';
        await booking.save();

        const confirmedBooking = await Booking.findById(booking._id).populate('user').populate('hall');

        if (!confirmedBooking) {
            console.error("Failed to retrieve confirmed booking details after payment.");
            return;
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
            sendEmail({
                io,
                email: emailToSend,
                subject: 'Payment Confirmation and Receipt',
                html: generatePaymentConfirmationEmail(bookingForEmail),
                attachments: [{ filename: `receipt-${bookingForEmail.bookingId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
                notification: {
                    recipient: confirmedBooking.user._id.toString(),
                    message: `Your payment for booking #${confirmedBooking.bookingId} has been confirmed.`,
                    link: `/bookings/${confirmedBooking._id}`,
                },
            }).catch(e => console.error("Failed to send booking confirmation email:", e));
        }
    }
}

const makePayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).populate({
        path: 'hall',
        select: 'name owner',
        populate: {
            path: 'owner',
            select: '_id'
        }
    });

    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }

    if (booking.bookingType !== 'walk-in' && !req.user) {
        throw new ApiError(401, 'You must be logged in to make a payment for a standard booking.');
    }

    if (!process.env.MONNIFY_CONTRACT_CODE) {
        throw new ApiError(500, 'MONNIFY_CONTRACT_CODE is not defined in environment variables.');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/payment/verify`;

    const uniquePaymentReference = `${bookingId}_${Date.now()}`;

    let customerName;
    let customerEmail;

    if (booking.bookingType === 'walk-in') {
        if (!booking.walkInUserDetails || !booking.walkInUserDetails.fullName || !booking.walkInUserDetails.email) {
            throw new ApiError(400, 'Walk-in booking is missing customer name or email for payment.');
        }
        customerName = booking.walkInUserDetails.fullName;
        customerEmail = booking.walkInUserDetails.email;
    } else {
        customerName = req.user.fullName;
        customerEmail = req.user.email;
    }

    const data = {
        amount: booking.totalPrice,
        customerName,
        customerEmail,
        paymentReference: uniquePaymentReference,
        paymentDescription: `Payment for booking of ${booking.hall.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
        redirectUrl: redirectUrl,
    };

    const commissionSetting = await Setting.findOne({ key: 'commissionRate' });
    if (commissionSetting && commissionSetting.value > 0) {
        const hallOwnerId = booking.hall.owner._id;
        const subAccount = await SubAccount.findOne({ user: hallOwnerId });

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
            console.log(`No sub-account found for hall owner ${hallOwnerId}. Proceeding without split.`);
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

    console.log("Verifying payment for reference:", paymentReference);
    const response = await verifyTransaction(paymentReference);
    console.log("Monnify verification response:", response);

    const { paymentStatus, paymentReference: refFromMonnify, transactionReference, paymentMethod } = response.responseBody;

    // If the payment reference contains an underscore, it's a booking payment.
    const isBookingPayment = refFromMonnify.includes('_');

    if (isBookingPayment) {
        await processBookingTransaction(response.responseBody, req.app.get('io'));
    }

    // --- Subscription Payment ---
    if (!isBookingPayment) {
        await processTransaction(response.responseBody, req.app.get('io'));
    }

    // Return a response to the frontend
    const type = isBookingPayment ? 'booking' : 'subscription';
    return res.status(200).json(new ApiResponse(200, { status: paymentStatus, type }, 'Verification complete.'));
});

const handleMonnifyWebhook = asyncHandler(async (req, res) => {
    console.log("Received Monnify webhook:", req.body);
    const { eventType, eventData } = req.body;

    if (eventType !== 'SUCCESSFUL_TRANSACTION') {
        return res.status(200).json(new ApiResponse(200, null, 'Webhook received, but not a successful transaction.'));
    }

    const { paymentReference } = eventData;

    if (!paymentReference) {
        throw new ApiError(400, 'Payment reference is required in webhook payload.');
    }

    // Reuse the same verification logic
    const response = await verifyTransaction(paymentReference);
    const transactionData = response.responseBody;

    const isBookingPayment = transactionData.paymentReference.includes('_');

    if (isBookingPayment) {
        await processBookingTransaction(transactionData, req.app.get('io'));
    } else {
        await processTransaction(transactionData, req.app.get('io'));
    }

    res.status(200).json(new ApiResponse(200, null, 'Webhook processed successfully.'));
});

export { makePayment, verifyPayment, handleMonnifyWebhook };
