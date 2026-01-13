import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyMonnifySignature } from '../middlewares/monnify.middleware.js';
import { makePayment, makePaymentForRecurring, makePaymentForReservation, verifyPayment, handleMonnifyWebhook } from '../controllers/payment.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing
 */

/**
 * @swagger
 * /api/v1/payments/initialize/recurring/{recurringBookingId}:
 *   post:
 *     summary: Initialize payment for a recurring booking series
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recurringBookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: The UUID for the recurring booking series.
 *     responses:
 *       200:
 *         description: Payment initialized successfully.
 *       400:
 *         description: Payment has already been made for this booking.
 *       404:
 *         description: No bookings found for the provided recurring ID.
 */
router.route('/initialize/recurring/:recurringBookingId').post(verifyJWT, makePaymentForRecurring);


/**
 * @swagger
 * /api/v1/payments/reservations/{reservationId}/pay:
 *   post:
 *     summary: Initialize payment for a reservation fee
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         schema:
 *           type: string
 *         required: true
 *         description: The human-readable ID of the reservation.
 *     responses:
 *       200:
 *         description: Payment initialized successfully.
 *       400:
 *         description: Reservation fee has already been paid.
 *       404:
 *         description: Reservation not found.
 */
router.route('/reservations/:reservationId/pay').post(verifyJWT, makePaymentForReservation);

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
 *       400:
 *         description: Payment has already been made for this booking.
 *       404:
 *         description: Booking not found.
 */
router.route('/initialize/:bookingId').post(verifyJWT, makePayment);

/**
 * @swagger
 * /api/v1/payments/verify:
 *   get:
 *     summary: Verify a payment transaction
 *     tags: [Payments]
 *     description: >
 *       Verifies the status of a transaction with the payment gateway.
 *       This endpoint should be called by the frontend after the user is redirected back from the payment gateway.
 *       It returns a JSON response with the final status, which the frontend can use to show an appropriate message or redirect the user.
 *     parameters:
 *       - in: query
 *         name: paymentReference
 *         schema:
 *           type: string
 *         required: true
 *         description: The payment reference returned by the payment gateway.
 *         example: "your_payment_reference_here"
 *     responses:
 *       200:
 *         description: Payment status verified successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Payment reference is missing.
 *       404:
 *         description: No matching transaction found for the reference.
 */
router.route('/verify').get(verifyPayment);

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Handle Monnify webhook notifications
 *     tags: [Payments]
 *     description: >
 *       Receives transaction completion notifications from Monnify.
 *       This is a server-to-server endpoint and should be configured in your Monnify dashboard.
 *       It ensures payment status is updated even if the user closes their browser.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactionReference:
 *                 type: string
 *               paymentReference:
 *                 type: string
 *               amountPaid:
 *                 type: string
 *               totalPayable:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully.
 *       400:
 *         description: Invalid webhook payload.
 *       401:
 *         description: Invalid signature (if signature validation is implemented).
 */
router.route('/webhook').post(verifyMonnifySignature, handleMonnifyWebhook);

export default router;
