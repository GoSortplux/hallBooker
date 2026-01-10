import express from 'express';
import {
    createReservation,
    verifyReservationPayment,
    convertReservation,
    verifyConversionPayment,
    getReservationsForHall,
    getReservationById,
    walkInReservation,
    getMyReservations
} from '../controllers/reservation.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/reservations/my-reservations:
 *   get:
 *     summary: Get all reservations for the currently logged-in user
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, CONVERTED, EXPIRED]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
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
 *         description: A paginated list of the user's reservations.
 */
router.route('/my-reservations').get(verifyJWT, getMyReservations);

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
 * /api/v1/reservations/walk-in:
 *   post:
 *     summary: Create a walk-in reservation (Admin/Staff only)
 *     description: |
 *       Allows authorized users (admins, staff, hall-owners) to create a reservation for a walk-in customer.
 *       The `paymentStatus` is determined by the server based on the `paymentMethod` provided and should not be included in the request body.
 *       - Using 'online' as the `paymentMethod` creates a reservation with a 'pending' status and emails a payment link to the customer.
 *       - Using any other valid offline method (e.g., 'CASH', 'POS') creates a reservation with a 'paid' status.
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
 *               - walkInUserDetails
 *               - paymentMethod
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
 *                   $ref: '#/components/schemas/BookingFacilityInput'
 *               walkInUserDetails:
 *                  $ref: '#/components/schemas/WalkInUserDetails'
 *               paymentMethod:
 *                  type: string
 *                  enum: [cash, pos, online]
 *                  description: "'online' will create a pending reservation and send a payment link. Others create an active reservation."
 *     responses:
 *       '201':
 *         description: Walk-in reservation created successfully.
 */
router.route('/walk-in').post(verifyJWT, authorizeRoles('super-admin', 'hall-owner', 'staff'), walkInReservation);

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
 *         name: paymentStatus
 *         schema:
 *           type: string
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
 *     description: |
 *       This endpoint handles the conversion of an active reservation (where the initial fee has been paid) into a confirmed booking by settling the remaining balance. It supports multiple workflows:
 *
 *       **1. Online User Conversion:**
 *       - A regular user calls this endpoint for their own reservation.
 *       - The system calculates the remaining balance and initiates a new online payment transaction.
 *       - The response contains the payment gateway URL, which the frontend uses to redirect the user to complete the payment.
 *
 *       **2. Admin/Staff-led Online Conversion (for Walk-ins):**
 *       - An admin, staff, or hall owner calls this endpoint for a walk-in reservation.
 *       - The system uses the customer details from `walkInUserDetails` to initiate the online payment for the remaining balance.
 *       - The response contains a payment link that the admin can then share with the customer (e.g., via email or SMS) for them to complete the payment.
 *
 *       **3. Admin/Staff-led Offline Conversion:**
 *       - An admin, staff, or hall owner calls this endpoint and includes a `paymentMethod` in the request body (e.g., "cash", "pos").
 *       - The system assumes the remaining balance has been collected offline.
 *       - It bypasses the payment gateway and directly converts the reservation into a confirmed booking.
 *
 *       The endpoint automatically handles both regular and walk-in reservations, regardless of how the initial reservation fee was paid.
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
 *                 description: "For offline conversions by admin/staff (e.g., 'cash', 'pos'). Omit this field to initiate an online payment for the remaining balance."
 *     responses:
 *       '200':
 *         description: Online payment initiated. The response body contains the payment gateway URL.
 *       '201':
 *         description: Booking created directly for offline payments or if the remaining balance was zero.
 */
router.route('/:reservationId/convert').post(verifyJWT, convertReservation);


export default router;
