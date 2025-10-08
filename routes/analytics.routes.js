import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { getSuperAdminAnalytics, getVenueOwnerAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics for super admins and venue owners
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SuperAdminAnalytics:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: number
 *         totalVenues:
 *           type: number
 *         totalBookings:
 *           type: number
 *         totalRevenue:
 *           type: number
 *     VenueOwnerAnalytics:
 *       type: object
 *       properties:
 *         totalBookings:
 *           type: number
 *         totalRevenue:
 *           type: number
 *         totalVenues:
 *           type: number
 *         bookingsPerVenue:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               venueName:
 *                 type: string
 *               bookingCount:
 *                 type: number
 */

router.use(verifyJWT);

/**
 * @swagger
 * /analytics/super-admin:
 *   get:
 *     summary: Get analytics for super admin
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Super admin analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SuperAdminAnalytics'
 */
router.route('/super-admin').get(authorizeRoles('super-admin'), getSuperAdminAnalytics);

/**
 * @swagger
 * /analytics/venue-owner:
 *   get:
 *     summary: Get analytics for venue owner
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Venue owner analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VenueOwnerAnalytics'
 */
router.route('/venue-owner').get(authorizeRoles('owner'), getVenueOwnerAnalytics);

export default router;