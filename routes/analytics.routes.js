import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { getSuperAdminAnalytics, getHallOwnerAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics for super admins and hall owners
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
 *         totalHalls:
 *           type: number
 *         totalBookings:
 *           type: number
 *         totalRevenue:
 *           type: number
 *     HallOwnerAnalytics:
 *       type: object
 *       properties:
 *         totalBookings:
 *           type: number
 *         totalRevenue:
 *           type: number
 *         totalHalls:
 *           type: number
 *         bookingsPerHall:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               hallName:
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
 * /analytics/hall-owner:
 *   get:
 *     summary: Get analytics for hall owner
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hall owner analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/HallOwnerAnalytics'
 */
router.route('/hall-owner').get(authorizeRoles('hall-owner'), getHallOwnerAnalytics);

export default router;