import { Router } from 'express';
import { verifyJWT, authorizeRoles, authorizeHallAccess } from '../middlewares/auth.middleware.js';
import { checkActiveLicense } from '../middlewares/license.middleware.js';
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
 *     Facility:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Backup generator"
 *         available:
 *           type: boolean
 *           example: true
 *         chargeable:
 *           type: boolean
 *           example: true
 *         chargeMethod:
 *           type: string
 *           enum: [free, flat, per_hour]
 *           example: "per_hour"
 *         cost:
 *           type: number
 *           example: 50
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
 *             $ref: '#/components/schemas/Facility'
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
 *     HallUpdateInput:
 *       type: object
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
 *             $ref: '#/components/schemas/Facility'
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
 *             $ref: '#/components/schemas/Facility'
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
 *           enum: [date-range, full-week, full-month, specific-days]
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request (e.g., geocoding failed, invalid data)
 */
router.route('/')
    .get(getAllHalls)
    .post(verifyJWT, authorizeRoles('hall-owner', 'super-admin'), checkActiveLicense, createHall);

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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *               $ref: '#/components/schemas/ApiResponse'
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
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       200:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request (e.g., invalid pattern)
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
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request (e.g., trying to toggle too soon)
 *       404:
 *         description: Hall not found
 */
router.route('/:id/toggle-online-booking')
    .patch(verifyJWT, authorizeHallAccess, checkActiveLicense, toggleOnlineBooking);

export default router;
