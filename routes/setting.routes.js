import express from 'express';
import {
    setCommissionRate,
    getCommissionRate,
    setPendingBookingDeletionTime,
    setOnlineBookingReactivationTime,
    setOnlineBookingDeactivationTime
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
 * /settings/commission-rate:
 *   post:
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
 *                 description: The commission rate in percentage (e.g., 10 for 10%)
 *     responses:
 *       200:
 *         description: Commission rate updated successfully
 *   get:
 *     summary: Get the current commission rate
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current commission rate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rate:
 *                   type: number
 */
router.post('/commission-rate', verifyJWT, authorizeRoles('super-admin'), setCommissionRate);
router.get('/commission-rate', verifyJWT, authorizeRoles('super-admin'), getCommissionRate);

/**
 * @swagger
 * /settings/pending-booking-deletion-time:
 *   put:
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
 *                 description: The time in minutes
 *     responses:
 *       200:
 *         description: Pending booking deletion time updated successfully
 */
router.put('/pending-booking-deletion-time', verifyJWT, authorizeRoles('super-admin'), setPendingBookingDeletionTime);

/**
 * @swagger
 * /settings/online-booking-reactivation-time:
 *   put:
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
 *                 description: The time in minutes
 *     responses:
 *       200:
 *         description: Online booking reactivation time updated successfully
 */
router.put('/online-booking-reactivation-time', verifyJWT, authorizeRoles('super-admin'), setOnlineBookingReactivationTime);

/**
 * @swagger
 * /settings/online-booking-deactivation-time:
 *   put:
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
 *                 description: The time in minutes
 *     responses:
 *       200:
 *         description: Online booking deactivation time updated successfully
 */
router.put('/online-booking-deactivation-time', verifyJWT, authorizeRoles('super-admin'), setOnlineBookingDeactivationTime);


export default router;