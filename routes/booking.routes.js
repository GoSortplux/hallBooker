import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
    createRecurringBooking,
    createBooking,
    walkInBooking,
    getMyBookings,
    getBookingById,
    getBookingByBookingId,
    updateBookingDetails,
    cancelBooking,
} from '../controllers/booking.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         bookingId:
 *           type: string
 *           description: The custom-generated ID for the booking.
 *         user:
 *           $ref: '#/components/schemas/User'
 *         hall:
 *           $ref: '#/components/schemas/Hall'
 *         bookingDates:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *         selectedFacilities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               facility:
 *                 type: string
 *                 description: "The ID of the master facility."
 *                 example: "60c72b2f9b1d8c001f8e4c6a"
 *               name:
 *                 type: string
 *                 example: "Projector"
 *               cost:
 *                 type: number
 *                 description: "The final calculated cost for this facility for the booking duration and quantity."
 *                 example: 150
 *               chargeMethod:
 *                 type: string
 *                 example: "flat"
 *               quantity:
 *                 type: number
 *                 example: 1
 *         eventDetails:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         hallPrice:
 *           type: number
 *         facilitiesPrice:
 *           type: number
 *         totalPrice:
 *           type: number
 *         paymentMethod:
 *           type: string
 *         paymentStatus:
 *           type: string
 *           enum: [pending, paid, failed]
 *         bookingType:
 *           type: string
 *           enum: [online, walk-in]
 *         isRecurring:
 *           type: boolean
 *         recurringBookingId:
 *           type: string
 *
 *     BookingFacilityInput:
 *       type: object
 *       description: "Specifies a facility and the quantity requested by the user for a booking."
 *       required: [facilityId, quantity]
 *       properties:
 *         facilityId:
 *           type: string
 *           description: "The ID of the facility."
 *           example: "60c72b2f9b1d8c001f8e4c6a"
 *         quantity:
 *           type: number
 *           description: "The number of units of the facility requested."
 *           example: 50
 *
 *     BookingInput:
 *       type: object
 *       required: [hall, bookingDates]
 *       properties:
 *         hall:
 *           type: string
 *           description: The ID of the hall to book.
 *         bookingDates:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *         eventDetails:
 *           type: string
 *         selectedFacilities:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BookingFacilityInput'
 *
 *     RecurringBookingInput:
 *       type: object
 *       description: "Provide either a 'recurrenceRule' object or a 'dates' array."
 *       required: [hallId, startTime, endTime, eventDetails]
 *       properties:
 *         hallId:
 *           type: string
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: "The start time for each recurring instance."
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: "The end time for each recurring instance."
 *         eventDetails:
 *           type: string
 *         recurrenceRule:
 *           type: object
 *           properties:
 *             frequency:
 *               type: string
 *               enum: [weekly, monthly]
 *             daysOfWeek:
 *               type: array
 *               items:
 *                 type: number
 *               description: "Required for 'weekly' frequency (0=Sun, 1=Mon, ...)."
 *             dayOfMonth:
 *               type: number
 *               description: "Required for 'monthly' frequency."
 *             endDate:
 *               type: string
 *               format: date
 *         dates:
 *           type: array
 *           items:
 *             type: string
 *             format: date
 *           description: "An array of specific dates to book."
 *           example: ["2025-10-05", "2025-10-12", "2025-10-19"]
 *
 *     WalkInBookingInput:
 *       type: object
 *       required: [hall, bookingDates, paymentMethod, walkInUserDetails]
 *       properties:
 *         hall:
 *           type: string
 *         bookingDates:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *         selectedFacilities:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BookingFacilityInput'
 *         paymentMethod:
 *           type: string
 *           enum: [cash, pos, transfer]
 *         walkInUserDetails:
 *           type: object
 *           properties:
 *             fullName:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *             phone:
 *               type: string
 *         eventDetails:
 *           type: string
 *
 *     WalkInUserDetails:
 *       type: object
 *       required: [fullName, phone]
 *       properties:
 *         fullName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *
 */

router.use(verifyJWT);

/**
 * @swagger
 * /api/v1/bookings/recurring:
 *   post:
 *     summary: Create a recurring booking (for Staff, Hall Owners, or Admins)
 *     description: |
 *       This endpoint functions similarly to a walk-in booking but for multiple dates.
 *       It allows authorized users to create a series of bookings based on a recurrence rule.
 *       Payment can be handled offline (cash, pos, transfer) or a payment link can be generated for online payment.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/RecurringBookingInput'
 *               - type: object
 *                 properties:
 *                   paymentMethod:
 *                     type: string
 *                     description: "The method of payment (e.g., 'cash', 'pos', 'online'). Required if status is 'paid'."
 *                   paymentStatus:
 *                     type: string
 *                     enum: [pending, paid]
 *                     description: "The current payment status."
 *                   walkInUserDetails:
 *                     $ref: '#/components/schemas/WalkInUserDetails'
 *     responses:
 *       201:
 *         description: Recurring booking created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     recurringBookingId:
 *                       type: string
 *                       description: A unique ID for the entire recurring series.
 *                 message:
 *                   type: string
 *                   example: "Recurring booking created successfully!"
 *       400:
 *         description: Bad request, such as invalid recurrence rule or conflicting booking.
 *       403:
 *         description: Forbidden, user is not authorized.
 */
router.route('/recurring').post(authorizeRoles('staff', 'hall-owner', 'super-admin'), createRecurringBooking);

/**
 * @swagger
 * /api/v1/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *           example:
 *             hallId: "60d0fe4f5311236168a109ca"
 *             bookingDates:
 *               - startTime: "2025-12-01T10:00:00.000Z"
 *                 endTime: "2025-12-01T14:00:00.000Z"
 *               - startTime: "2025-12-03T10:00:00.000Z"
 *                 endTime: "2025-12-03T14:00:00.000Z"
 *             eventDetails: "Birthday Party"
 *             selectedFacilities:
 *               - facilityId: "60c72b2f9b1d8c001f8e4c6a"
 *                 quantity: 100
 *               - facilityId: "60c72b2f9b1d8c001f8e4c6b"
 *                 quantity: 1
 *     responses:
 *       201:
 *         description: Booking created successfully, returns payment initialization details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: "Booking created successfully"
 *       400:
 *         description: Bad request. A conflict can occur if the time slot is already booked.
 */
router.route('/')
    .post(createBooking);

/**
 * @swagger
 * /api/v1/bookings/walk-in:
 *   post:
 *     summary: Create a walk-in booking (Staff/Hall Owner/Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalkInBookingInput'
 *           example:
 *             hallId: "60d0fe4f5311236168a109ca"
 *             bookingDates:
 *               - startTime: "2025-11-05T10:00:00.000Z"
 *                 endTime: "2025-11-05T17:00:00.000Z"
 *             eventDetails: "Team Offsite"
 *             walkInUserDetails:
 *               fullName: "Jane Doe"
 *               email: "jane.doe@example.com"
 *               phone: "555-555-5555"
 *             paymentMethod: "pos"
 *             paymentStatus: "paid"
 *     responses:
 *       201:
 *         description: Walk-in booking created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: "Walk-in booking created successfully"
 *       400:
 *         description: Bad request. A conflict can occur if the time slot is already booked.
 */
router.route('/walk-in')
    .post(authorizeRoles('staff', 'hall-owner', 'super-admin'), walkInBooking);

/**
 * @swagger
 * /api/v1/bookings/my-bookings:
 *   get:
 *     summary: Get all bookings for the current user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's bookings.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: "Bookings retrieved successfully"
 */
router.route('/my-bookings')
    .get(getMyBookings);
    
/**
 * @swagger
 * /api/v1/bookings/search/{bookingId}:
 *   get:
 *     summary: Get a booking by its custom booking ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         description: The custom-generated ID of the booking (e.g., 'BK123456').
 *     responses:
 *       200:
 *         description: Booking details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Booking'
 *                     - type: object
 *                       properties:
 *                         durationInHours:
 *                           type: number
 *                           description: "The total duration of the booking in hours."
 *                           example: 4.5
 *                         user:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             fullName:
 *                               type: string
 *                             email:
 *                               type: string
 *                             phone:
 *                               type: string
 *                         hall:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             fullAddress:
 *                               type: string
 *                 message:
 *                   type: string
 *                   example: "Booking retrieved successfully"
 *       404:
 *         description: Booking not found.
 */
router.route('/search/:bookingId')
    .get(authorizeRoles('user', 'hall-owner', 'super-admin'), getBookingByBookingId);

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   get:
 *     summary: Get a booking by its database ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *         required: true
 *     responses:
 *       200:
 *         description: Booking details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: "Booking retrieved successfully"
 *       404:
 *         description: Booking not found.
 *   patch:
 *     summary: Update booking event details
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventDetails:
 *                 type: string
 *                 description: The new details for the event.
 *     responses:
 *       200:
 *         description: Booking updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: "Booking updated successfully"
 *       404:
 *         description: Booking not found.
 */
router.route('/:id')
    .get(authorizeRoles('user', 'owner', 'super-admin'), getBookingById)
    .patch(authorizeRoles('user'), updateBookingDetails);

/**
 * @swagger
 * /api/v1/bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *         required: true
 *     responses:
 *       200:
 *         description: Booking cancelled successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: "Booking cancelled successfully"
 *       404:
 *         description: Booking not found.
 */
router.route('/:id/cancel')
    .patch(authorizeRoles('user', 'super-admin'), cancelBooking);

export default router;