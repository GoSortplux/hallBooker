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
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         selectedFacilityNames:
 *           type: array
 *           items:
 *             type: string
 *           description: An array of names of the selected facilities.
 *         numberOfPeople:
 *           type: number
 *         eventType:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
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
 *     BookingInput:
 *       type: object
 *       required: [hall, startTime, endTime]
 *       properties:
 *         hall:
 *           type: string
 *           description: The ID of the hall to book.
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         numberOfPeople:
 *           type: number
 *         eventType:
 *           type: string
 *
 *     RecurringBookingInput:
 *       type: object
 *       required: [hall, startDate, endDate, dayOfWeek, time]
 *       properties:
 *         hall:
 *           type: string
 *           description: The ID of the hall to book.
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         dayOfWeek:
 *           type: number
 *           description: The day of the week (0=Sun, 1=Mon, ...).
 *         time:
 *           type: string
 *           example: "14:00"
 *         numberOfPeople:
 *           type: number
 *         eventType:
 *           type: string
 *
 *     WalkInBookingInput:
 *       type: object
 *       required: [hall, startTime, endTime, paymentMethod, walkInUserDetails]
 *       properties:
 *         hall:
 *           type: string
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         selectedFacilityNames:
 *           type: array
 *           items:
 *             type: string
 *           description: An array of names of the selected facilities.
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
 *         numberOfPeople:
 *           type: number
 *         eventType:
 *           type: string
 *
 *     UpdateBookingDetailsInput:
 *       type: object
 *       properties:
 *         numberOfPeople:
 *           type: number
 *         eventType:
 *           type: string
 */

router.use(verifyJWT);

/**
 * @swagger
 * /bookings/recurring:
 *   post:
 *     summary: Create a recurring booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecurringBookingInput'
 *     responses:
 *       201:
 *         description: Recurring booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Bad request. A conflict can occur if the time slot is already booked (either confirmed or pending payment).
 */
router.route('/recurring').post(createRecurringBooking);

/**
 * @swagger
 * /bookings:
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
 *     responses:
 *       201:
 *         description: Booking created successfully, returns payment initialization details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Bad request. A conflict can occur if the time slot is already booked (either confirmed or pending payment).
 */
router.route('/')
    .post(createBooking);

/**
 * @swagger
 * /bookings/walk-in:
 *   post:
 *     summary: Create a walk-in booking (Staff/Owner/Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalkInBookingInput'
 *     responses:
 *       201:
 *         description: Walk-in booking created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Bad request. A conflict can occur if the time slot is already booked (either confirmed or pending payment).
 */
router.route('/walk-in')
    .post(authorizeRoles('staff', 'owner', 'super-admin'), walkInBooking);

/**
 * @swagger
 * /bookings/my-bookings:
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
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 */
router.route('/my-bookings')
    .get(getMyBookings);
    
/**
 * @swagger
 * /bookings/search/{bookingId}:
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
 *     responses:
 *       200:
 *         description: Booking details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found.
 */
router.route('/search/:bookingId')
    .get(authorizeRoles('user', 'owner', 'super-admin'), getBookingByBookingId);

/**
 * @swagger
 * /bookings/{id}:
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
 *         required: true
 *     responses:
 *       200:
 *         description: Booking details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found.
 *   patch:
 *     summary: Update booking details (e.g., number of people)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBookingDetailsInput'
 *     responses:
 *       200:
 *         description: Booking updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found.
 *   put:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Booking cancelled successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found.
 */
router.route('/:id')
    .get(authorizeRoles('user', 'owner', 'super-admin'), getBookingById)
    .patch(authorizeRoles('user'), updateBookingDetails)
    .put(authorizeRoles('user', 'super-admin'), cancelBooking);

export default router;