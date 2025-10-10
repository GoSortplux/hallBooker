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
 *         - percentageCharge
 *       properties:
 *         userId:
 *           type: string
 *           description: The ID of the user (hall owner) to create the subaccount for.
 *         percentageCharge:
 *           type: number
 *           description: The percentage of the transaction to be paid to this subaccount.
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
 * /subaccounts:
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
 *         description: Subaccount created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Subaccount'
 *       400:
 *         description: Bad request (e.g., user already has a subaccount)
 */
router.route('/')
    .post(verifyJWT, authorizeRoles('super-admin'), createSubAccount);

export default router;