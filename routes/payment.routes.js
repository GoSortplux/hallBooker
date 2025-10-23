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
 * /payments/initialize/{bookingId}:
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
 *         description: The database ID of the booking to pay for.
 *     responses:
 *       200:
 *         description: Payment initialized successfully. Returns payment gateway details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentInitializationResponse'
 *       404:
 *         description: Booking not found.
 */
router.route('/initialize/:bookingId').post(verifyJWT, makePayment);

/**
 * @swagger
 * /payments/verify:
 *   get:
 *     summary: Verify a payment using a query parameter
 *     tags: [Payments]
 *     description: This endpoint is typically used for the payment gateway's redirect URL.
 *     parameters:
 *       - in: query
 *         name: paymentReference
 *         schema:
 *           type: string
 *         required: true
 *         description: The payment reference from the payment gateway.
 *     responses:
 *       200:
 *         description: Payment verified successfully. The user is redirected to a success page.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentVerificationResponse'
 *       400:
 *         description: Payment verification failed.
 */
router.route('/verify').get(verifyPayment);

/**
 * @swagger
 * /payments/verify/{transactionReference}:
 *   get:
 *     summary: Verify a payment using a path parameter
 *     tags: [Payments]
 *     description: This endpoint can be used to manually re-verify a transaction status.
 *     parameters:
 *       - in: path
 *         name: transactionReference
 *         schema:
 *           type: string
 *         required: true
 *         description: The transaction reference to verify.
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentVerificationResponse'
 *       400:
 *         description: Payment verification failed.
 */
router.route('/verify/:transactionReference').get(verifyPayment);

export default router;