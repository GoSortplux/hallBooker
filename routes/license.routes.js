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
 *         paymentReference:
 *           type: string
 */

router.use(verifyJWT);

/**
 * @swagger
 * /licenses/recommend:
 *   get:
 *     summary: Get a recommended license tier for the hall owner
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The recommended license tier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LicenseTier'
 */
router.route('/recommend')
    .get(authorizeRoles('hall-owner'), getRecommendedTier);

/**
 * @swagger
 * /licenses:
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
 *         description: Subscription purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/License'
 */
router.route('/')
    .post(authorizeRoles('hall-owner'), purchaseSubscription);

/**
 * @swagger
 * /licenses/upgrade:
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
 *         description: Subscription upgraded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/License'
 */
router.route('/upgrade')
    .post(authorizeRoles('hall-owner'), upgradeSubscription);

/**
 * @swagger
 * /licenses/my-subscription:
 *   get:
 *     summary: Get the current user's active subscription
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current active license
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/License'
 *       404:
 *         description: No active subscription found
 */
router.route('/my-subscription')
    .get(authorizeRoles('hall-owner'), getMyCurrentSubscription);

/**
 * @swagger
 * /licenses/my-history:
 *   get:
 *     summary: Get the current user's subscription history
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of past subscriptions
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
 *                     $ref: '#/components/schemas/License'
 */
router.route('/my-history')
    .get(authorizeRoles('hall-owner'), getMySubscriptionHistory);

/**
 * @swagger
 * /licenses/user/{userId}/history:
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
 *     responses:
 *       200:
 *         description: A list of the user's past subscriptions
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
 *                     $ref: '#/components/schemas/License'
 */
router.route('/user/:userId/history')
    .get(authorizeRoles('super-admin'), getSubscriptionHistoryForUser);

export default router;