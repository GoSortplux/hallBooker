import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
    purchaseSubscription,
    upgradeSubscription,
    getMyCurrentSubscription,
    getMySubscriptionHistory,
    getSubscriptionHistoryForUser,
    getRecommendedTier
} from '../controllers/license.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Licenses
 *   description: License and subscription management for hall owners
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     License:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *         tier:
 *           $ref: '#/components/schemas/LicenseTier'
 *         status:
 *           type: string
 *           enum: [active, expired, cancelled]
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *     SubscriptionInput:
 *       type: object
 *       required: [licenseTierId, paymentReference]
 *       properties:
 *         licenseTierId:
 *           type: string
 *           example: "60d0fe4f5311236168a109ce"
 *         paymentReference:
 *           type: string
 *           example: "pay_ref_12345"
 */

router.use(verifyJWT);

/**
 * @swagger
 * /api/v1/licenses:
 *   post:
 *     summary: Purchase a new license subscription
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionInput'
 *     responses:
 *       201:
 *         description: Subscription purchased successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       200:
 *         description: Payment initialized successfully for a paid tier.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.route('/')
    .post(authorizeRoles('hall-owner'), purchaseSubscription);

/**
 * @swagger
 * /api/v1/licenses/recommend:
 *   get:
 *     summary: Get a recommended license tier for the hall owner
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The recommended license tier.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.route('/recommend')
    .get(authorizeRoles('hall-owner'), getRecommendedTier);

/**
 * @swagger
 * /api/v1/licenses/upgrade:
 *   post:
 *     summary: Upgrade an existing license subscription
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionInput'
 *     responses:
 *       200:
 *         description: Subscription upgrade payment initialized successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.route('/upgrade')
    .post(authorizeRoles('hall-owner'), upgradeSubscription);

/**
 * @swagger
 * /api/v1/licenses/my-subscription:
 *   get:
 *     summary: Get the current user's active subscription
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current active license.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: No active subscription found.
 */
router.route('/my-subscription')
    .get(authorizeRoles('hall-owner'), getMyCurrentSubscription);

/**
 * @swagger
 * /api/v1/licenses/my-history:
 *   get:
 *     summary: Get the current user's subscription history
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of past subscriptions.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.route('/my-history')
    .get(authorizeRoles('hall-owner'), getMySubscriptionHistory);

/**
 * @swagger
 * /api/v1/licenses/user/{userId}/history:
 *   get:
 *     summary: Get subscription history for a specific user (Super Admin only)
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: A list of the user's past subscriptions.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.route('/user/:userId/history')
    .get(authorizeRoles('super-admin'), getSubscriptionHistoryForUser);

export default router;