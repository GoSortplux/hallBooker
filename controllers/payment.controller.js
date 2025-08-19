import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { initializeTransaction, verifyTransaction } from '../services/payment.service.js';
import { Booking } from '../models/booking.model.js';
import { ApiError } from '../utils/apiError.js';

const makePayment = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }

    const data = {
        amount: booking.totalPrice,
        customerName: req.user.fullName,
        customerEmail: req.user.email,
        paymentReference: bookingId,
        paymentDescription: `Payment for booking of ${booking.venue.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: `${process.env.FRONTEND_URL}/bookings`,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"]
    };

    const response = await initializeTransaction(data);

    res.status(200).json(new ApiResponse(200, response.responseBody, 'Transaction initialized successfully'));
});

const verifyPayment = asyncHandler(async (req, res) => {
    const { transactionReference } = req.params;
    const response = await verifyTransaction(transactionReference);

    if (response.responseBody.paymentStatus === 'PAID') {
        const booking = await Booking.findById(transactionReference);
        if (booking) {
            booking.status = 'confirmed';
            await booking.save();
        }
    }

    res.status(200).json(new ApiResponse(200, response.responseBody, 'Transaction verified successfully'));
});

export { makePayment, verifyPayment };
