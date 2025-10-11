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
 * /analytics/super-admin:
 *   get:
 *     summary: Get platform-wide analytics for super admins
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Super admin analytics fetched successfully.
 */
router.route('/super-admin').get(authorizeRoles('super-admin'), getSuperAdminAnalytics);

/**
 * @swagger
 * /analytics/hall-owner:
 *   get:
 *     summary: Get analytics for the current hall owner
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hall owner analytics fetched successfully.
 */
router.route('/hall-owner').get(authorizeRoles('hall-owner'), getHallOwnerAnalytics);


/**
 * @swagger
 * /analytics/halls/{hallId}:
 *   get:
 *     summary: Get analytics data for a specific hall
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
 *         description: The start date for the analytics data range.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: The end date for the analytics data range.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [view, demo-booking]
 *         description: Filter by analytics type.
 *     responses:
 *       200:
 *         description: Analytics data fetched successfully.
 */
router.route('/halls/:hallId').get(authorizeHallAccess, getHallAnalytics);

export default router;
