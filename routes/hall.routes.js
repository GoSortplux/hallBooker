import { Router } from 'express';
import { verifyJWT, authorizeRoles, authorizeHallAccess } from '../middlewares/auth.middleware.js';
import { checkActiveLicense } from '../middlewares/license.middleware.js';
import {
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
 *     Hall:
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
 *     HallInput:
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
 *     HallMediaInput:
 *       type: object
 *       required: [media]
 *       properties:
 *         media:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: An array of media URLs to add to the hall
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
 * /halls/recommendations:
 *   get:
 *     summary: Get recommended halls based on user's location
 *     tags: [Halls]
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
 *         description: A list of recommended halls
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
 *                     $ref: '#/components/schemas/Hall'
 */
router.route('/recommendations').get(getRecommendedHalls);

/**
 * @swagger
 * /halls:
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
 *         description: A list of halls
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
 *                     $ref: '#/components/schemas/Hall'
 */
router.route('/').get(getAllHalls);

/**
 * @swagger
 * /halls/{id}:
 *   get:
 *     summary: Get a hall by ID
 *     tags: [Halls]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Hall details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *       404:
 *         description: Hall not found
 */
router.route('/:id').get(getHallById);

router.use(verifyJWT);

/**
 * @swagger
 * /halls/by-owner:
 *   get:
 *     summary: Get all halls owned by the current user (owner/staff)
 *     tags: [Halls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's halls
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
 *                     $ref: '#/components/schemas/Hall'
 */
router.route('/by-owner').get(authorizeRoles('hall-owner', 'staff'), getHallsByOwner);

/**
 * @swagger
 * /halls:
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
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
 *       400:
 *         description: Bad request (e.g., geocoding failed, invalid data)
 */
router.route('/')
    .post(authorizeRoles('hall-owner', 'super-admin'), checkActiveLicense, createHall);

/**
 * @swagger
 * /halls/{id}:
 *   put:
 *     summary: Update a hall
 *     tags: [Halls]
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
 *             $ref: '#/components/schemas/HallInput'
 *     responses:
 *       200:
 *         description: Hall updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Hall'
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
 *     responses:
 *       200:
 *         description: Hall deleted successfully
 *       404:
 *         description: Hall not found
 */
router.route('/:id')
    .put(authorizeHallAccess, checkActiveLicense, updateHall)
    .delete(authorizeHallAccess, checkActiveLicense, deleteHall);

/**
 * @swagger
 * /halls/media/generate-signature:
 *   post:
 *     summary: Generate a Cloudinary signature for media upload
 *     tags: [Halls]
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
 * /halls/{id}/media:
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HallMediaInput'
 *     responses:
 *       200:
 *         description: Media added successfully
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
    .post(authorizeHallAccess, checkActiveLicense, addHallMedia)
    .delete(authorizeHallAccess, checkActiveLicense, deleteHallMedia);

/**
 * @swagger
 * /halls/{id}/reservations:
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
    .post(authorizeHallAccess, checkActiveLicense, createReservation);

export default router;