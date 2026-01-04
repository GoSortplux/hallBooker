import { Router } from 'express';
import { verifyJWT, authorizeRoles, authorizeHallAccess } from '../middlewares/auth.middleware.js';
import { checkActiveLicense } from '../middlewares/license.middleware.js';
import { checkHallCreationLimit } from '../middlewares/subscription.middleware.js';
import {
    toggleOnlineBooking,
    createHall,
    getAllHalls,
    getHallById,
    updateHall,
    deleteHall,
    addHallMedia,
    deleteHallMedia,
    getHallsByOwner,
    getRecommendedHalls,
    generateCloudinarySignature,
    createReservation,
    bookDemo,
    getHallBookings,
    getHallUnavailableDates,
} from '../controllers/hall.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Halls
 *   description: Hall management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FacilityInput:
 *       type: object
 *       description: "Defines a facility when a hall owner adds it to a hall."
 *       properties:
 *         facility:
 *           type: string
 *           description: "The ID of the facility from the master list."
 *           example: "60c72b2f9b1d8c001f8e4c6a"
 *         available:
 *           type: boolean
 *           example: true
 *         chargeable:
 *           type: boolean
 *           example: true
 *         chargeMethod:
 *           type: string
 *           description: "The method of charging. Valid options are dynamically fetched from settings (e.g., 'flat', 'per_hour')."
 *           example: "flat"
 *         cost:
 *           type: number
 *           example: 5
 *         quantity:
 *           type: number
 *           description: "The total number of this item available (e.g., 150 chairs)."
 *           example: 150
 *         chargePerUnit:
 *           type: boolean
 *           description: "If true, 'cost' is per unit. If false, 'cost' is a lump sum for any quantity."
 *           example: true
 *       required:
 *         - facility
 *     Hall:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         country:
 *           type: string
 *         state:
 *           type: string
 *         localGovernment:
 *           type: string
 *         description:
 *           type: string
 *         media:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *         owner:
 *           $ref: '#/components/schemas/User'
 *         capacity:
 *           type: number
 *         openingHour:
 *           type: string
 *           example: "09:00"
 *         closingHour:
 *           type: string
 *           example: "23:00"
 *         location:
 *           type: string
 *         geoLocation:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               example: Point
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               example: [-73.935242, 40.730610]
 *         pricing:
 *           type: object
 *           properties:
 *             dailyRate:
 *               type: number
 *             hourlyRate:
 *               type: number
 *         facilities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               facility:
 *                 type: string
 *                 example: "60c72b2f9b1d8c001f8e4c6a"
 *               available:
 *                 type: boolean
 *                 example: true
 *               chargeable:
 *                 type: boolean
 *                 example: false
 *               chargeMethod:
 *                 type: string
 *                 example: "free"
 *               cost:
 *                 type: number
 *                 example: 0
 *         carParkCapacity:
 *           type: number
 *           example: 50
 *         hallSize:
 *           type: string
 *           example: "100 sqm"
 *         bookingBufferInHours:
 *           type: number
 *           description: "Buffer period in hours before and after a booking."
 *           example: 2
 *         rules:
 *           type: array
 *           items:
 *             type: string
 *     HallUpdateInput:
 *       type: object
 *       description: "Use one of the following methods to update facilities, not both. 1) To add or update a single facility, provide its details at the root level. 2) To replace all facilities, provide a complete array for the `facilities` field."
 *       properties:
 *         name:
 *           type: string
 *         country:
 *           type: string
 *         state:
 *           type: string
 *         localGovernment:
 *           type: string
 *         description:
 *           type: string
 *         capacity:
 *           type: number
 *         openingHour:
 *           type: string
 *           example: "09:00"
 *         closingHour:
 *           type: string
 *           example: "23:00"
 *         location:
 *           type: string
 *           description: "The full address of the hall. If a precise location cannot be found, a Google Maps search URL will be generated instead."
 *         pricing:
 *           type: object
 *           properties:
 *             dailyRate:
 *               type: number
 *             hourlyRate:
 *               type: number
 *         carParkCapacity:
 *           type: number
 *           example: 50
 *         hallSize:
 *           type: string
 *           example: "100 sqm"
 *         bookingBufferInHours:
 *           type: number
 *           description: "Buffer period in hours before and after a booking. Defaults to 5 if not provided."
 *           example: 2
 *         rules:
 *           type: array
 *           items:
 *             type: string
 *         availability:
 *           type: string
 *           example: "available"
 *         blockedDates:
 *           type: array
 *           items:
 *             type: string
 *             format: date
 *           example: ["2024-12-25"]
 *         directionUrl:
 *           type: string
 *           format: uri
 *           example: "https://www.google.com/maps/dir/?api=1&destination=40.730610,-73.935242"
 *         allowRecurringBookings:
 *           type: boolean
 *           description: "Set to true to enable recurring bookings for this hall."
 *           example: true
 *         recurringBookingDiscount:
 *           type: object
 *           description: "Configuration for recurring booking discounts. Can be partially updated."
 *           properties:
 *             percentage:
 *               type: number
 *               description: "The discount percentage (0-100)."
 *               example: 10
 *             minBookings:
 *               type: number
 *               description: "The minimum number of bookings required to qualify for the discount."
 *               example: 5
 *       oneOf:
 *         - type: object
 *           properties:
 *             facility:
 *               type: string
 *               description: "ID of the single facility to add or update."
 *               example: "60c72b2f9b1d8c001f8e4c6a"
 *             available:
 *               type: boolean
 *             chargeable:
 *               type: boolean
 *             chargeMethod:
 *               type: string
 *             cost:
 *               type: number
 *         - type: object
 *           properties:
 *             facilities:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FacilityInput'
 *               description: "An array to completely replace all of the hall's facilities."
 *     HallInput:
 *       type: object
 *       required: [name, description, capacity, openingHour, closingHour, location, pricing, country, state, localGovernment]
 *       properties:
 *         name:
 *           type: string
 *           example: "The Grand Ballroom"
 *         country:
 *           type: string
 *           example: "60d0fe4f5311236168a109cb"
 *         state:
 *           type: string
 *           example: "60d0fe4f5311236168a109cc"
 *         localGovernment:
 *           type: string
 *           example: "60d0fe4f5311236168a109cd"
 *         description:
 *           type: string
 *           example: "A beautiful and spacious hall for all your events."
 *         capacity:
 *           type: number
 *           example: 200
 *         openingHour:
 *           type: string
 *           example: "09:00"
 *         closingHour:
 *           type: string
 *           example: "23:00"
 *         location:
 *           type: string
 *           description: "The full address of the hall. If a precise location cannot be found, a Google Maps search URL will be generated instead."
 *           example: "123 Main St, New York, NY"
 *         pricing:
 *           type: object
 *           properties:
 *             dailyRate:
 *               type: number
 *               example: 1500
 *             hourlyRate:
 *               type: number
 *               example: 200
 *         facilities:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FacilityInput'
 *         carParkCapacity:
 *           type: number
 *           example: 50
 *         hallSize:
 *           type: string
 *           example: "100 sqm"
 *         rules:
 *           type: array
 *           items:
 *             type: string
 *           example: ["No smoking", "No pets"]
 *         allowRecurringBookings:
 *           type: boolean
 *           description: "Set to true to enable recurring bookings for this hall."
 *           example: true
 *         recurringBookingDiscount:
 *           type: object
 *           description: "Configuration for recurring booking discounts."
 *           properties:
 *             percentage:
 *               type: number
 *               description: "The discount percentage (0-100)."
 *               example: 10
 *             minBookings:
 *               type: number
 *               description: "The minimum number of bookings required to qualify for the discount."
 *               example: 5
 *     HallMediaInput:
 *       type: object
 *       required: [imageUrl]
 *       properties:
 *         imageUrl:
 *           type: string
 *           format: uri
 *           description: "URL of the image to add. Only one image can be added at a time."
 *           example: "https://example.com/image.jpg"
 *         videoUrl:
 *           type: string
 *           format: uri
 *           description: "URL of the video to add. Can be added alongside an image."
 *           example: "https://example.com/video.mp4"
 *     ReservationInput:
 *       type: object
 *       required: [reservationPattern]
 *       properties:
 *         reservationPattern:
 *           type: string
 *           enum: [date-range, full-week, full-month, specific-days, specific-dates]
 *           example: "date-range"
 *         startDate:
 *           type: string
 *           format: date
 *           example: "2024-08-01"
 *         endDate:
 *           type: string
 *           format: date
 *           example: "2024-08-05"
 *         year:
 *           type: number
 *           example: 2024
 *         month:
 *           type: number
 *           example: 8
 *         week:
 *           type: number
 *           example: 1
 *         days:
 *           type: array
 *           items:
 *             type: number
 *           description: "An array of numbers representing days of the week (0=Sun, 1=Mon,...)"
 *           example: [1, 3, 5]
 *         dates:
 *           type: array
 *           items:
 *             type: string
 *             format: date
 *           description: "An array of specific dates to reserve."
 *           example: ["2024-12-25", "2025-01-01"]
 */

/**
 * @swagger
 * /api/v1/halls:
 *   get:
 *     summary: Get all halls with optional filtering
 *     tags: [Halls]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search by keyword in name or location
 *       - in: query
 *         name: minCapacity
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: A list of halls.
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
 *                     $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Halls fetched successfully"
 *   post:
 *     summary: Create a new hall
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HallInput'
 *     responses:
 *       201:
 *         description: Hall created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Hall created successfully"
 *       400:
 *         description: Bad request (e.g., invalid data)
 */
router.route('/')
    .get(getAllHalls)
    .post(verifyJWT, authorizeRoles('hall-owner', 'super-admin'), checkActiveLicense, checkHallCreationLimit, createHall);

/**
 * @swagger
 * /api/v1/halls/recommendations:
 *   get:
 *     summary: Get recommended halls based on user's location
 *     tags: [Halls]
 *     parameters:
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         required: true
 *         example: -73.935242
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         required: true
 *         example: 40.730610
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: "Search radius in kilometers. Defaults to 10."
 *         example: 5
 *     responses:
 *       200:
 *         description: A list of recommended halls.
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
 *                     $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Recommended halls fetched successfully"
 */
router.route('/recommendations').get(getRecommendedHalls);

/**
 * @swagger
 * /api/v1/halls/by-owner:
 *   get:
 *     summary: Get all halls owned by the current user (owner/staff)
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's halls.
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
 *                     $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Halls fetched successfully"
 */
router.route('/by-owner').get(verifyJWT, authorizeRoles('hall-owner', 'staff'), getHallsByOwner);

/**
 * @swagger
 * /api/v1/halls/media/generate-signature:
 *   post:
 *     summary: Generate a Cloudinary signature for media upload
 *     description: "Generates the necessary signature and timestamp for direct client-side uploads to Cloudinary, ensuring the request is authentic."
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signature generated successfully
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
 *                     signature:
 *                       type: string
 *                     timestamp:
 *                       type: integer
 *                     api_key:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Signature generated successfully"
 */
router.route('/media/generate-signature')
    .post(verifyJWT, authorizeRoles('hall-owner', 'staff', 'super-admin'), generateCloudinarySignature);


/**
 * @swagger
 * /api/v1/halls/{id}:
 *   get:
 *     summary: Get a hall by ID
 *     tags: [Halls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Hall details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Hall details fetched successfully"
 *       404:
 *         description: Hall not found
 *   patch:
 *     summary: Update a hall (partial updates)
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HallUpdateInput'
 *     responses:
 *       200:
 *         description: Hall updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Hall updated successfully"
 *       404:
 *         description: Hall not found
 *   delete:
 *     summary: Delete a hall
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Hall deleted successfully
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
 *                   example: "Hall deleted successfully"
 *       404:
 *         description: Hall not found
 */
router.route('/:id')
    .get(getHallById)
    .patch(verifyJWT, authorizeHallAccess, checkActiveLicense, updateHall)
    .delete(verifyJWT, authorizeHallAccess, checkActiveLicense, deleteHall);

/**
 * @swagger
 * /api/v1/halls/{id}/book-demo:
 *   post:
 *     summary: Record a "Book a Demo" click and get owner contact
 *     description: "Tracks an analytics event for a demo booking request and returns the hall owner's contact details."
 *     tags: [Halls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Demo booking click recorded and owner contact details returned.
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
 *                     phone:
 *                       type: string
 *                     whatsappNumber:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: "Owner contact details fetched successfully"
 *       404:
 *         description: Hall not found
 */
router.route('/:id/book-demo').post(bookDemo);

/**
 * @swagger
 * /api/v1/halls/{id}/media:
 *   post:
 *     summary: Add media to a hall
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HallMediaInput'
 *     responses:
 *       200:
 *         description: Media added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Media added successfully"
 *       400:
 *         description: Bad request (e.g., max number of images reached)
 *   delete:
 *     summary: Delete media from a hall
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mediaUrl]
 *             properties:
 *               mediaUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image_to_delete.jpg"
 *     responses:
 *       200:
 *         description: Media deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Media deleted successfully"
 */
router.route('/:id/media')
    .post(verifyJWT, authorizeHallAccess, checkActiveLicense, addHallMedia)
    .delete(verifyJWT, authorizeHallAccess, checkActiveLicense, deleteHallMedia);

/**
 * @swagger
 * /api/v1/halls/{id}/reservations:
 *   post:
 *     summary: Create a reservation (block dates) for a hall
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 */
router.route('/:id/reservations')
    .post(verifyJWT, authorizeHallAccess, checkActiveLicense, createReservation);

/**
 * @swagger
 * /api/v1/halls/{id}/toggle-online-booking:
 *   patch:
 *     summary: Toggle the online booking status for a hall
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Online booking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Online booking status updated successfully"
 *       400:
 *         description: Bad request (e.g., trying to toggle too soon)
 *       404:
 *         description: Hall not found
 */
router.route('/:id/toggle-online-booking')
    .patch(verifyJWT, authorizeHallAccess, checkActiveLicense, toggleOnlineBooking);

/**
 * @swagger
 * /api/v1/halls/{id}/bookings:
 *   get:
 *     summary: Get all bookings for a specific hall
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the hall.
 *         example: "60d0fe4f5311236168a109ca"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled]
 *         description: "Filter bookings by status."
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The start date for a date range filter."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The end date for a date range filter."
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: "Field to sort by."
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: "Sort order."
 *     responses:
 *       200:
 *         description: A list of bookings for the hall.
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
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         totalBookings:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *                 message:
 *                   type: string
 *                   example: "Bookings fetched successfully"
 *       403:
 *         description: Forbidden - User does not have access to this hall.
 *       404:
 *         description: Hall not found.
 */
router.route('/:id/bookings')
    .get(verifyJWT, authorizeHallAccess, getHallBookings);

/**
 * @swagger
 * /api/v1/halls/{id}/unavailable-dates:
 *   get:
 *     summary: Get all unavailable dates for a hall
 *     tags: [Halls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the hall.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Optional start date to filter unavailable slots."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "Optional end date to filter unavailable slots."
 *     responses:
 *       200:
 *         description: An array of unavailable time slots.
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
 *                     type: object
 *                     properties:
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *                   example: "Unavailable dates fetched successfully"
 *       404:
 *         description: Hall not found.
 */
router.route('/:id/unavailable-dates')
    .get(getHallUnavailableDates);

export default router;
