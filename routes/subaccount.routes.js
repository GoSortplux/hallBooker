import { Router } from 'express';
import { createSubAccount } from '../controllers/subaccount.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subaccounts
 *   description: Subaccount management for payment splitting (Super Admin only)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubaccountInput:
 *       type: object
 *       required:
 *         - userId
 *         - bankCode
 *         - accountNumber
 *         - accountName
 *       properties:
 *         userId:
 *           type: string
 *           description: "The ID of the user (hall owner) to create the subaccount for."
 *           example: "60d0fe4f5311236168a109ca"
 *         bankCode:
 *           type: string
 *           description: "The 3-digit code for the bank."
 *           example: "058"
 *         accountNumber:
 *           type: string
 *           description: "The user's bank account number."
 *           example: "0123456789"
 *         accountName:
 *           type: string
 *           description: "The name associated with the bank account."
 *           example: "John Doe"
 *
 *     Subaccount:
 *       type: object
 *       properties:
 *         subAccountCode:
 *           type: string
 *         accountName:
 *           type: string
 *         accountNumber:
 *           type: string
 *         bankName:
 *           type: string
 */

/**
 * @swagger
 * /api/v1/subaccounts:
 *   post:
 *     summary: Create a new subaccount for a hall owner (Super Admin only)
 *     tags: [Subaccounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubaccountInput'
 *     responses:
 *       201:
 *         description: Subaccount created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad request (e.g., user already has a subaccount).
 *       404:
 *         description: Hall owner not found.
 */
router.route('/')
    .post(verifyJWT, authorizeRoles('super-admin'), createSubAccount);

export default router;