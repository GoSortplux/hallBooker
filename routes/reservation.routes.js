import express from 'express';
import {
    createReservation,
    verifyReservationPayment,
    convertReservation,
    verifyConversionPayment,
    getReservationsForHall,
    getReservationById
} from '../controllers/reservation.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: API for managing hall reservations
 */

/**
 * @swagger
 * /api/v1/reservations:
 *   post:
 *     summary: Initiate a new hall reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hallId
 *               - bookingDates
 *               - eventDetails
 *             properties:
 *               hallId:
 *                 type: string
 *               bookingDates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *               eventDetails:
 *                 type: string
 *               selectedFacilities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     facilityId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               walkInUserDetails:
 *                  type: object
 *                  properties:
 *                      fullName:
 *                          type: string
 *                      email:
 *                          type: string
 *                      phone:
 *                          type: string
 *     responses:
 *       '200':
 *         description: Reservation payment initiated successfully.
 */
router.route('/').post(verifyJWT, createReservation);

/**
 * @swagger
 * /api/v1/reservations/verify:
 *   get:
 *     summary: Verify a reservation payment after redirect from payment gateway
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: paymentReference
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       '302':
 *         description: Redirects to a frontend payment success or failure page.
 */
router.route('/verify').get(verifyReservationPayment);

/**
 * @swagger
 * /api/v1/reservations/verify-conversion:
 *   get:
 *     summary: Verify a conversion payment after redirect from payment gateway
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: paymentReference
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       '302':
 *         description: Redirects to a frontend payment success or failure page.
 */
router.route('/verify-conversion').get(verifyConversionPayment);

/**
 * @swagger
 * /api/v1/reservations/halls/{hallId}:
 *   get:
 *     summary: Get all reservations for a specific hall (for admins/owners)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, CONVERTED, EXPIRED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: A paginated list of reservations for the hall.
 */
router.route('/halls/:hallId').get(verifyJWT, authorizeRoles('super-admin', 'hall-owner', 'staff'), getReservationsForHall);

/**
 * @swagger
 * /api/v1/reservations/{reservationId}:
 *   get:
 *     summary: Get a single reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: The reservation details.
 *       '403':
 *         description: Forbidden.
 *       '404':
 *         description: Reservation not found.
 */
router.route('/:reservationId').get(verifyJWT, getReservationById);

/**
 * @swagger
 * /api/v1/reservations/{reservationId}/convert:
 *   post:
 *     summary: Convert an active reservation to a full booking
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 description: "For offline conversions by admin/staff. E.g., 'cash', 'pos'. Omit for online payment."
 *     responses:
 *       '200':
 *         description: Conversion payment initiated for online users.
 *       '201':
 *         description: Booking created directly for offline or zero-balance conversions.
 */
router.route('/:reservationId/convert').post(verifyJWT, convertReservation);


export default router;
