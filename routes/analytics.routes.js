import { Router } from 'express';
import {
    getSuperAdminAnalytics,
    getHallOwnerAnalytics,
    getHallAnalytics
} from '../controllers/analytics.controller.js';
import { verifyJWT, authorizeRoles, authorizeHallAccess } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics for halls and platform
 */

/**
 * @swagger
 * /api/v1/analytics/super-admin:
 *   get:
 *     summary: Get platform-wide analytics for super admins
 *     description: Retrieves key statistics for the entire platform, available only to super-admins.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Super admin analytics fetched successfully.
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
 *                     totalUsers:
 *                       type: integer
 *                       example: 150
 *                     totalHalls:
 *                       type: integer
 *                       example: 75
 *                     totalBookings:
 *                       type: integer
 *                       example: 300
 *                     activeSubscriptions:
 *                       type: integer
 *                       example: 50
 *                 message:
 *                   type: string
 *                   example: "Super admin analytics fetched successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 */
router.route('/super-admin').get(authorizeRoles('super-admin'), getSuperAdminAnalytics);

/**
 * @swagger
 * /api/v1/analytics/hall-owner:
 *   get:
 *     summary: Get analytics for the current hall owner
 *     description: Retrieves key statistics for all halls belonging to the currently authenticated hall owner.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hall owner analytics fetched successfully.
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
 *                     totalHalls:
 *                       type: integer
 *                       example: 5
 *                     totalBookings:
 *                       type: integer
 *                       example: 25
 *                     totalViews:
 *                       type: integer
 *                       example: 1200
 *                     totalDemoBookings:
 *                       type: integer
 *                       example: 30
 *                 message:
 *                   type: string
 *                   example: "Hall owner analytics fetched successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a hall-owner.
 */
router.route('/hall-owner').get(authorizeRoles('hall-owner'), getHallOwnerAnalytics);


/**
 * @swagger
 * /api/v1/analytics/halls/{hallId}:
 *   get:
 *     summary: Get analytics data for a specific hall
 *     description: Retrieves detailed analytics for a specific hall, with optional filtering by date range and type. Access is restricted to the hall owner or a super-admin.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the hall to get analytics for.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The start date for the analytics data range (e.g., '2023-01-01')."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The end date for the analytics data range (e.g., '2023-01-31')."
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [view, demo-booking]
 *         description: Filter by analytics type.
 *     responses:
 *       200:
 *         description: Analytics data fetched successfully.
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
 *                     totalCount:
 *                       type: integer
 *                       example: 42
 *                     analyticsData:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d0fe4f5311236168a109ca"
 *                           type:
 *                             type: string
 *                             example: "view"
 *                           hall:
 *                             type: string
 *                             example: "60d0fe4f5311236168a109cb"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2023-07-20T14:48:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Hall analytics data fetched successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have access to this hall.
 *       404:
 *         description: Hall not found.
 */
router.route('/halls/:hallId').get(authorizeHallAccess, getHallAnalytics);

export default router;
