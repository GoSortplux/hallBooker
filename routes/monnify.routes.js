import { Router } from 'express';
import { validateBankAccount, getBanks } from '../controllers/monnify.controller.js';
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
 * /api/v1/monnify/banks:
 *   get:
 *     summary: Get a list of all supported banks from Monnify
 *     tags: [Monnify]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of banks retrieved successfully.
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
 *                       name:
 *                         type: string
 *                         example: "ACCESS BANK"
 *                       code:
 *                         type: string
 *                         example: "044"
 *                 message:
 *                   type: string
 *                   example: "Banks retrieved successfully."
 *       500:
 *         description: Failed to retrieve banks.
 */
router.route('/banks').get(verifyJWT, getBanks);

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
