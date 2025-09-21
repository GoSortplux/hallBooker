import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { initializeTransaction, verifyTransaction } from '../services/payment.service.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/apiError.js';

const makePayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate('venue', 'name');

    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }

    if (!process.env.MONNIFY_CONTRACT_CODE) {
        throw new ApiError(500, 'MONNIFY_CONTRACT_CODE is not defined in environment variables.');
    }

    const data = {
        amount: booking.totalPrice,
        customerName: req.user.fullName,
        customerEmail: req.user.email,
        paymentReference: bookingId,
        paymentDescription: `Payment for booking of ${booking.venue.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
         ...(process.env.FRONTEND_URL && { redirectUrl: `${process.env.FRONTEND_URL}/bookings` })
    };

    const response = await initializeTransaction(data);

    res.status(200).json(new ApiResponse(200, response.responseBody, 'Transaction initialized successfully'));
});

const verifyPayment = asyncHandler(async (req, res) => {
    const { transactionReference } = req.params;
    const response = await verifyTransaction(transactionReference);

    if (response.responseBody.paymentStatus === 'PAID') {
        const booking = await Booking.findById(response.responseBody.paymentReference);
        if (booking) {
            booking.status = 'confirmed';
            await booking.save();
        }
    }

    const redirectUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/bookings` : null;

    res.status(200).json(new ApiResponse(200, { ...response.responseBody, redirectUrl }, 'Transaction verified successfully'));
});

export { makePayment, verifyPayment };
