import { Router } from 'express';
import {
  getHallOwnerApplications,
  approveHallOwnerApplication,
  rejectHallOwnerApplication,
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
 * /pending-hallowner-request:
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
 *                       status:
 *                         type: string
 *                         example: "pending"
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
  .route('/')
  .get(verifyJWT, authorizeRoles('super-admin'), getHallOwnerApplications);

router
  .route('/:userId/approve')
  .patch(verifyJWT, authorizeRoles('super-admin'), approveHallOwnerApplication);

router
    .route('/:userId/reject')
    .patch(verifyJWT, authorizeRoles('super-admin'), rejectHallOwnerApplication)

export default router;