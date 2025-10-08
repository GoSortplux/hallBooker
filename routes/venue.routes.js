import { Router } from 'express';
import { verifyJWT, authorizeRoles, authorizeVenueAccess } from '../middlewares/auth.middleware.js';
import { checkActiveLicense } from '../middlewares/license.middleware.js';
import {
    createVenue,
    getAllVenues,
    getVenueById,
    updateVenue,
    deleteVenue,
    addVenueMedia,
    deleteVenueMedia,
    getVenuesByOwner,
    getRecommendedVenues,
    generateCloudinarySignature,
    createReservation,
} from '../controllers/venue.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Venues
 *   description: Venue management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Venue:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
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
 *             perHour:
 *               type: number
 *             perDay:
 *               type: number
 *             perDayPlusHour:
 *                type: object
 *                properties:
 *                  dayRate:
 *                    type: number
 *                  hourRate:
 *                    type: number
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         rules:
 *           type: array
 *           items:
 *             type: string
 *         availability:
 *           type: string
 *         blockedDates:
 *           type: array
 *           items:
 *             type: string
 *             format: date
 *         directionUrl:
 *           type: string
 *           format: uri
 *     VenueInput:
 *       type: object
 *       required: [name, description, capacity, openingHour, closingHour, location, pricing]
 *       properties:
 *         name:
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
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         rules:
 *           type: array
 *           items:
 *             type: string
 *     VenueMediaInput:
 *       type: object
 *       required: [media]
 *       properties:
 *         media:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: An array of media URLs to add to the venue
 *     ReservationInput:
 *       type: object
 *       required: [pattern]
 *       properties:
 *         pattern:
 *           type: string
 *           enum: [date-range, full-week, full-month, days-of-week]
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         days:
 *           type: array
 *           items:
 *             type: number
 *           description: An array of numbers representing days of the week (0=Sun, 1=Mon,...)
 *     CloudinarySignatureSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             signature:
 *               type: string
 *             timestamp:
 *               type: number
 *             api_key:
 *               type: string
 */

/**
 * @swagger
 * /venues/recommendations:
 *   get:
 *     summary: Get recommended venues based on user's location
 *     tags: [Venues]
 *     parameters:
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         required: true
 *     responses:
 *       200:
 *         description: A list of recommended venues
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
 *                     $ref: '#/components/schemas/Venue'
 */
router.route('/recommendations').get(getRecommendedVenues);

/**
 * @swagger
 * /venues:
 *   get:
 *     summary: Get all venues with optional filtering
 *     tags: [Venues]
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
 *         description: A list of venues
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
 *                     $ref: '#/components/schemas/Venue'
 */
router.route('/').get(getAllVenues);

/**
 * @swagger
 * /venues/{id}:
 *   get:
 *     summary: Get a venue by ID
 *     tags: [Venues]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Venue details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Venue'
 *       404:
 *         description: Venue not found
 */
router.route('/:id').get(getVenueById);

router.use(verifyJWT);

/**
 * @swagger
 * /venues/by-owner:
 *   get:
 *     summary: Get all venues owned by the current user (owner/staff)
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's venues
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
 *                     $ref: '#/components/schemas/Venue'
 */
router.route('/by-owner').get(authorizeRoles('owner', 'staff'), getVenuesByOwner);

/**
 * @swagger
 * /venues:
 *   post:
 *     summary: Create a new venue
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VenueInput'
 *     responses:
 *       201:
 *         description: Venue created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Venue'
 *       400:
 *         description: Bad request (e.g., geocoding failed, invalid data)
 */
router.route('/')
    .post(authorizeRoles('owner', 'super-admin'), checkActiveLicense, createVenue);

/**
 * @swagger
 * /venues/{id}:
 *   put:
 *     summary: Update a venue
 *     tags: [Venues]
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
 *             $ref: '#/components/schemas/VenueInput'
 *     responses:
 *       200:
 *         description: Venue updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Venue'
 *       404:
 *         description: Venue not found
 *   delete:
 *     summary: Delete a venue
 *     tags: [Venues]
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
 *         description: Venue deleted successfully
 *       404:
 *         description: Venue not found
 */
router.route('/:id')
    .put(authorizeVenueAccess, checkActiveLicense, updateVenue)
    .delete(authorizeVenueAccess, checkActiveLicense, deleteVenue);

/**
 * @swagger
 * /venues/media/generate-signature:
 *   post:
 *     summary: Generate a Cloudinary signature for media upload
 *     tags: [Venues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signature generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CloudinarySignatureSuccess'
 */
router.route('/media/generate-signature')
    .post(authorizeRoles('owner', 'staff', 'super-admin'), generateCloudinarySignature);

/**
 * @swagger
 * /venues/{id}/media:
 *   post:
 *     summary: Add media to a venue
 *     tags: [Venues]
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
 *             $ref: '#/components/schemas/VenueMediaInput'
 *     responses:
 *       200:
 *         description: Media added successfully
 *       400:
 *         description: Bad request (e.g., max number of images reached)
 *   delete:
 *     summary: Delete media from a venue
 *     tags: [Venues]
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
 *             type: object
 *             required: [mediaUrl]
 *             properties:
 *               mediaUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Media deleted successfully
 */
router.route('/:id/media')
    .post(authorizeVenueAccess, checkActiveLicense, addVenueMedia)
    .delete(authorizeVenueAccess, checkActiveLicense, deleteVenueMedia);

/**
 * @swagger
 * /venues/{id}/reservations:
 *   post:
 *     summary: Create a reservation (block dates) for a venue
 *     tags: [Venues]
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
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       200:
 *         description: Reservation created successfully
 *       400:
 *         description: Bad request (e.g., invalid pattern)
 */
router.route('/:id/reservations')
    .post(authorizeVenueAccess, checkActiveLicense, createReservation);

export default router;