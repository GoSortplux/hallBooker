import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { makePayment, verifyPayment, handleMonnifyWebhook } from '../controllers/payment.controller.js';

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
router.route('/webhook').post(handleMonnifyWebhook);

export default router;