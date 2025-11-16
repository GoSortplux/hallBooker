import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { makePayment, verifyPayment } from '../controllers/payment.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing
 */

/**
 * @swagger
 * /api/v1/payments/initialize/{bookingId}:
 *   post:
 *     summary: Initialize a payment for a booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: The custom booking ID (e.g., 'BK123456') to pay for.
 *         example: "BK123456"
 *     responses:
 *       200:
 *         description: Payment initialized successfully. Returns payment gateway details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Transaction initialized successfully"
 *       404:
 *         description: Booking not found.
 */
router.route('/initialize/:bookingId').post(verifyJWT, makePayment);

/**
 * @swagger
 * /api/v1/payments/verify:
 *   get:
 *     summary: Verify a payment
 *     tags: [Payments]
 *     description: "Verifies a payment using a reference string. This endpoint is used as the redirect URL from the payment gateway. Based on the payment status, the user is redirected to different frontend URLs."
 *     parameters:
 *       - in: query
 *         name: paymentReference
 *         schema:
 *           type: string
 *         required: true
 *         description: The unique payment reference for the transaction.
 *         example: "your_payment_reference_here"
 *     responses:
 *       302:
 *         description: >
 *           Redirects the user to a frontend URL based on the payment outcome.
 *           - **Successful Booking Payment:** Redirects to `/bookings`.
 *           - **Successful Subscription Payment:** Redirects to `/dashboard/subscription`.
 *           - **Failed Payment:** Redirects to `/payment-failed`.
 *           - **Cancelled Payment:** Redirects to `/payment-cancelled`.
 *           - **Pending Payment:** Redirects to `/payment-pending`.
 *       400:
 *         description: Payment reference is missing from the query.
 *       404:
 *         description: No matching booking or pending subscription found for the reference.
 */
router.route('/verify').get(verifyPayment);

export default router;