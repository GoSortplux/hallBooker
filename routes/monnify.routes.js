import { Router } from 'express';
import { validateBankAccount } from '../controllers/monnify.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Monnify
 *   description: Monnify services integration
 */

/**
 * @swagger
 * /api/v1/monnify/validate-account:
 *   post:
 *     summary: Validate a bank account using Monnify
 *     tags: [Monnify]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountNumber
 *               - bankCode
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 description: The account number to validate.
 *               bankCode:
 *                 type: string
 *                 description: The bank code for the account.
 *     responses:
 *       200:
 *         description: Account details retrieved successfully.
 *       500:
 *         description: Failed to validate bank account.
 */
router.route('/validate-account').post(verifyJWT, validateBankAccount);

export default router;
