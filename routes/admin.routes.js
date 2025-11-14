import { Router } from 'express';
import {
  getHallOwnerApplications,
  approveHallOwnerApplication,
  rejectHallOwnerApplication,
  addPaymentMethod,
  removePaymentMethod,
  addPaymentStatus,
  removePaymentStatus,
} from '../controllers/admin.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only operations
 */

/**
 * @swagger
 * /api/v1/admin/hall-owner-applications:
 *   get:
 *     summary: Retrieve a list of pending hall owner applications
 *     description: Fetches a list of users who have applied for the 'hall-owner' role and are awaiting approval. This endpoint is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of pending applications.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d0fe4f5311236168a109ca"
 *                       fullName:
 *                         type: string
 *                         example: "John Doe"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       phone:
 *                         type: string
 *                         example: "+1234567890"
 *                       hallOwnerApplication:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                 message:
 *                   type: string
 *                   example: "Pending hall owner applications retrieved successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 *       404:
 *         description: No pending hall owner applications found.
 */
router
  .route('/hall-owner-applications')
  .get(verifyJWT, authorizeRoles('super-admin'), getHallOwnerApplications);

/**
 * @swagger
 * /api/v1/admin/hall-owner-applications/{userId}/approve:
 *   patch:
 *     summary: Approve a hall owner application
 *     description: Approves a pending application for a user to become a 'hall-owner'. This action changes the user's status to 'approved'. Restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose application is being approved.
 *     responses:
 *       200:
 *         description: Application approved successfully.
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
 *                 message:
 *                   type: string
 *                   example: "Hall owner application approved successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 *       404:
 *         description: User not found.
 */
router
  .route('/hall-owner-applications/:userId/approve')
  .patch(verifyJWT, authorizeRoles('super-admin'), approveHallOwnerApplication);

/**
 * @swagger
 * /api/v1/admin/hall-owner-applications/{userId}/reject:
 *   patch:
 *     summary: Reject a hall owner application
 *     description: Rejects a pending application for a user to become a 'hall-owner'. This action changes the user's status to 'rejected'. Restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose application is being rejected.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: "Incomplete application."
 *     responses:
 *       200:
 *         description: Application rejected successfully.
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
 *                 message:
 *                   type: string
 *                   example: "Hall owner application rejected successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 *       404:
 *         description: User not found.
 */
router
    .route('/hall-owner-applications/:userId/reject')
    .patch(verifyJWT, authorizeRoles('super-admin'), rejectHallOwnerApplication)

/**
 * @swagger
 * /api/v1/admin/payment-methods:
 *   post:
 *     summary: Add a new payment method
 *     description: Adds a new payment method to the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 example: "crypto"
 *     responses:
 *       200:
 *         description: Payment method added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["cash", "pos", "bank-transfer", "online", "crypto"]
 *                 message:
 *                   type: string
 *                   example: "Payment method added successfully"
 *       400:
 *         description: Bad Request - Payment method is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router.route('/payment-methods').post(verifyJWT, authorizeRoles('super-admin'), addPaymentMethod);
router.route('/payment-methods/remove').post(verifyJWT, authorizeRoles('super-admin'), removePaymentMethod);

/**
 * @swagger
 * /api/v1/admin/payment-methods/remove:
 *   post:
 *     summary: Remove a payment method
 *     description: Removes a payment method from the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 example: "crypto"
 *     responses:
 *       200:
 *         description: Payment method removed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["cash", "pos", "bank-transfer", "online"]
 *                 message:
 *                   type: string
 *                   example: "Payment method removed successfully"
 *       400:
 *         description: Bad Request - Payment method is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
// Routes for managing payment statuses
/**
 * @swagger
 * /api/v1/admin/payment-statuses:
 *   post:
 *     summary: Add a new payment status
 *     description: Adds a new payment status to the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentStatus]
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 example: "refunded"
 *     responses:
 *       200:
 *         description: Payment status added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["pending", "paid", "failed", "refunded"]
 *                 message:
 *                   type: string
 *                   example: "Payment status added successfully"
 *       400:
 *         description: Bad Request - Payment status is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router.route('/payment-statuses').post(verifyJWT, authorizeRoles('super-admin'), addPaymentStatus);

/**
 * @swagger
 * /api/v1/admin/payment-statuses/remove:
 *   post:
 *     summary: Remove a payment status
 *     description: Removes a payment status from the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentStatus]
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 example: "refunded"
 *     responses:
 *       200:
 *         description: Payment status removed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["pending", "paid", "failed"]
 *                 message:
 *                   type: string
 *                   example: "Payment status removed successfully"
 *       400:
 *         description: Bad Request - Payment status is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router.route('/payment-statuses/remove').post(verifyJWT, authorizeRoles('super-admin'), removePaymentStatus);

export default router;