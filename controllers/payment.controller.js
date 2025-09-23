import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { initializeTransaction, verifyTransaction } from '../services/payment.service.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/apiError.js';
import sendEmail from '../services/email.service.js';
import { generatePaymentConfirmationEmail } from '../utils/emailTemplates.js';
import { generatePdfReceipt } from '../utils/pdfGenerator.js';

const makePayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate('venue', 'name');

    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }

    if (!process.env.MONNIFY_CONTRACT_CODE) {
        throw new ApiError(500, 'MONNIFY_CONTRACT_CODE is not defined in environment variables.');
    }

    const redirectUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/bookings`
        : `${req.protocol}://${req.get('host')}/api/v1/payments/verify`;

    const data = {
        amount: booking.totalPrice,
        customerName: req.user.fullName,
        customerEmail: req.user.email,
        paymentReference: bookingId,
        paymentDescription: `Payment for booking of ${booking.venue.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
        redirectUrl: redirectUrl
    };

    const response = await initializeTransaction(data);

    res.status(200).json(new ApiResponse(200, response.responseBody, 'Transaction initialized successfully'));
});

const verifyPayment = asyncHandler(async (req, res) => {
    const { paymentReference } = req.query;

    if (!paymentReference) {
        // This case handles direct calls to /verify without a reference,
        // which might happen if a user navigates there by mistake.
        const { transactionReference } = req.params;
        if (!transactionReference) {
             throw new ApiError(400, 'Transaction reference or payment reference is required');
        }

        const response = await verifyTransaction(transactionReference);
         if (response.responseBody.paymentStatus === 'PAID') {
            const booking = await Booking.findById(response.responseBody.paymentReference);
            if (booking) {
                booking.status = 'confirmed';
                await booking.save();
            }
        }
         const redirectUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/bookings` : null;
        return res.status(200).json(new ApiResponse(200, { ...response.responseBody, redirectUrl }, 'Transaction verified successfully'));
    }

    const response = await verifyTransaction(paymentReference);

    if (response.responseBody.paymentStatus === 'PAID') {
        const booking = await Booking.findById(response.responseBody.paymentReference).populate('user').populate('venue');
        if (booking) {
            booking.status = 'confirmed';
            booking.paymentStatus = 'paid';
            await booking.save();

            // Generate PDF receipt as an ArrayBuffer
            const pdfArrayBuffer = generatePdfReceipt(booking);
            // Convert to a Node.js Buffer for nodemailer
            const pdfBuffer = Buffer.from(pdfArrayBuffer);

            // Send payment confirmation email
            await sendEmail({
                email: booking.user.email,
                subject: 'Payment Confirmation and Receipt',
                html: generatePaymentConfirmationEmail(booking),
                attachments: [
                    {
                        filename: `receipt-${booking._id}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
            });
        }
    }

    // If there is no frontend URL, send a simple HTML success page.
    if (!process.env.FRONTEND_URL) {
        return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Successful</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
                    .container { text-align: center; padding: 40px; background-color: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; }
                    h1 { color: #4CAF50; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Payment Successful</h1>
                    <p>Your payment has been successfully processed. You can now close this page.</p>
                </div>
            </body>
            </html>
        `);
    }

    // If there is a frontend URL, redirect back to the bookings page.
    res.redirect(`${process.env.FRONTEND_URL}/bookings`);
});

export { makePayment, verifyPayment };
