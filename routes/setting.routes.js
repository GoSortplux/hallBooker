import express from 'express';
import {
    setCommissionRate,
    getCommissionRate,
    setPendingBookingDeletionTime,
    setOnlineBookingReactivationTime,
    setOnlineBookingDeactivationTime,
    getBookingOptions
} from '../controllers/setting.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Application settings management (Super Admin only)
 */

/**
 * @swagger
 * /api/v1/settings/commission-rate:
 *   patch:
 *     summary: Set the commission rate for online bookings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rate]
 *             properties:
 *               rate:
 *                 type: number
 *                 description: "The commission rate in percentage (e.g., 10 for 10%)."
 *                 example: 10
 *     responses:
 *       200:
 *         description: Commission rate updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *                 message:
 *                   type: string
 *                   example: "Commission rate updated successfully"
 *   get:
 *     summary: Get the current commission rate
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current commission rate.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *                 message:
 *                   type: string
 *                   example: "Commission rate retrieved successfully"
 *       404:
 *         description: Commission rate has not been set yet.
 */
router.route('/commission-rate')
    .get(verifyJWT, authorizeRoles('super-admin'), getCommissionRate)
    .patch(verifyJWT, authorizeRoles('super-admin'), setCommissionRate);

/**
 * @swagger
 * /api/v1/settings/pending-booking-deletion-time:
 *   patch:
 *     summary: Set the time in minutes to wait before deleting a pending booking
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [time]
 *             properties:
 *               time:
 *                 type: number
 *                 description: "The time in minutes."
 *                 example: 30
 *     responses:
 *       200:
 *         description: Pending booking deletion time updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *                 message:
 *                   type: string
 *                   example: "Pending booking deletion time updated successfully"
 */
router.patch('/pending-booking-deletion-time', verifyJWT, authorizeRoles('super-admin'), setPendingBookingDeletionTime);

/**
 * @swagger
 * /api/v1/settings/online-booking-reactivation-time:
 *   patch:
 *     summary: Set the time in minutes to wait before a hall owner can re-enable online booking
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [time]
 *             properties:
 *               time:
 *                 type: number
 *                 description: "The time in minutes."
 *                 example: 1440
 *     responses:
 *       200:
 *         description: Online booking reactivation time updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *                 message:
 *                   type: string
 *                   example: "Online booking reactivation time updated successfully"
 */
router.patch('/online-booking-reactivation-time', verifyJWT, authorizeRoles('super-admin'), setOnlineBookingReactivationTime);

/**
 * @swagger
 * /api/v1/settings/online-booking-deactivation-time:
 *   patch:
 *     summary: Set the time in minutes a hall owner must wait after re-enabling online booking before they can disable it again
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [time]
 *             properties:
 *               time:
 *                 type: number
 *                 description: "The time in minutes."
 *                 example: 300
 *     responses:
 *       200:
 *         description: Online booking deactivation time updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Setting'
 *                 message:
 *                   type: string
 *                   example: "Online booking deactivation time updated successfully"
 */
router.patch('/online-booking-deactivation-time', verifyJWT, authorizeRoles('super-admin'), setOnlineBookingDeactivationTime);

/**
 * @swagger
 * /api/v1/settings/booking-options:
 *   get:
 *     summary: Get available booking options
 *     description: Fetches the lists of available payment methods and payment statuses for creating or updating a booking. Accessible by hall owners, staff, and super-admins.
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved booking options.
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
 *                   properties:
 *                     paymentMethods:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["cash", "pos", "bank-transfer", "online"]
 *                     paymentStatuses:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["pending", "paid", "failed"]
 *                 message:
 *                   type: string
 *                   example: "Successfully retrieved booking options"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required role.
 */
router.route('/booking-options').get(
  verifyJWT,
  authorizeRoles('hall-owner', 'staff', 'super-admin'),
  getBookingOptions
);

export default router;