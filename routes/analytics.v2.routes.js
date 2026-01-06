import { Router } from 'express';
import {
  getHallOwnerAnalytics,
  getSuperAdminAnalytics,
} from '../controllers/analytics.v2.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes in this file will require JWT authentication
router.use(verifyJWT);

/**
 * @swagger
 * tags:
 *   name: Analytics V2
 *   description: Enhanced and detailed analytics for hall owners and super admins.
 */

/**
 * @swagger
 * /api/v2/analytics/hall-owner:
 *   get:
 *     summary: Get enhanced analytics for the current hall owner
 *     description: |
 *       Retrieves a comprehensive analytics dashboard for the currently authenticated hall owner.
 *       The data can be filtered by a date range. If no date range is provided, it defaults to the last 7 days.
 *     tags: [Analytics V2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The start date for the analytics data range (e.g., '2023-01-01'). Defaults to 7 days ago."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The end date for the analytics data range (e.g., '2023-01-31'). Defaults to today."
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: "The page number for paginating recent bookings."
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: "The number of recent bookings to return per page."
 *     responses:
 *       200:
 *         description: Hall owner analytics fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HallOwnerAnalyticsResponse'
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a hall-owner.
 */
router
  .route('/hall-owner')
  .get(authorizeRoles('hall-owner'), getHallOwnerAnalytics);

/**
 * @swagger
 * /api/v2/analytics/super-admin:
 *   get:
 *     summary: Get enhanced platform-wide analytics for super admins
 *     description: |
 *       Retrieves a comprehensive analytics dashboard for the entire platform, accessible only to super admins.
 *       The data can be filtered by a date range. If no date range is provided, it defaults to the last 7 days.
 *     tags: [Analytics V2]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The start date for the analytics data range (e.g., '2023-01-01'). Defaults to 7 days ago."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: "The end date for the analytics data range (e.g., '2023-01-31'). Defaults to today."
 *       - in: query
 *         name: hallId
 *         schema:
 *           type: string
 *         description: "Optional. Filter commission analytics by a specific hall ID."
 *     responses:
 *       200:
 *         description: Super admin analytics fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuperAdminAnalyticsResponse'
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 */
router
  .route('/super-admin')
  .get(authorizeRoles('super-admin'), getSuperAdminAnalytics);

export default router;
