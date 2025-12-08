import { Router } from 'express';
import {
  createLicenseTier,
  getAllLicenseTiers,
  getLicenseTierById,
  updateLicenseTier,
  deleteLicenseTier,
} from '../controllers/licenseTier.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: License Tiers
 *     description: Management of license tiers (Super Admin only)
 *   - name: License Tiers (Hall Owner/Staff)
 *     description: License tier information for hall owners and staff
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LicenseTier:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         durationInDays:
 *           type: number
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         maxHalls:
 *           type: number
 *
 *     LicenseTierInput:
 *       type: object
 *       required: [name, price, durationInDays, maxHalls]
 *       properties:
 *         name:
 *           type: string
 *           example: "Premium"
 *         price:
 *           type: number
 *           example: 500
 *         durationInDays:
 *           type: number
 *           example: 30
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Feature A", "Feature B"]
 *         maxHalls:
 *           type: number
 *           example: 10
 */

/**
 * @swagger
 * /api/v1/license-tiers:
 *   post:
 *     summary: Create a new license tier (Super Admin only)
 *     tags: [License Tiers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LicenseTierInput'
 *     responses:
 *       201:
 *         description: License tier created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/LicenseTier'
 *                 message:
 *                   type: string
 *                   example: "License tier created successfully"
 *   get:
 *     summary: Get all license tiers
 *     tags: [License Tiers (Hall Owner/Staff)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of license tiers.
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
 *                     $ref: '#/components/schemas/LicenseTier'
 *                 message:
 *                   type: string
 *                   example: "License tiers fetched successfully"
 */
router
  .route('/')
  .post(verifyJWT, authorizeRoles('super-admin'), createLicenseTier)
  .get(verifyJWT, authorizeRoles('super-admin', 'hall-owner', 'staff'), getAllLicenseTiers);

/**
 * @swagger
 * /api/v1/license-tiers/{id}:
 *   get:
 *     summary: Get a license tier by ID
 *     tags: [License Tiers (Hall Owner/Staff)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ce"
 *     responses:
 *       200:
 *         description: The license tier object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/LicenseTier'
 *                 message:
 *                   type: string
 *                   example: "License tier fetched successfully"
 *       404:
 *         description: License tier not found
 *   patch:
 *     summary: Update a license tier (Super Admin only)
 *     tags: [License Tiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ce"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LicenseTierInput'
 *     responses:
 *       200:
 *         description: License tier updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/LicenseTier'
 *                 message:
 *                   type: string
 *                   example: "License tier updated successfully"
 *       404:
 *         description: License tier not found
 *   delete:
 *     summary: Delete a license tier (Super Admin only)
 *     tags: [License Tiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ce"
 *     responses:
 *       200:
 *         description: License tier deleted successfully.
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
 *                   example: "License tier deleted successfully"
 *       404:
 *         description: License tier not found
 */
router
  .route('/:id')
  .get(verifyJWT, authorizeRoles('super-admin', 'hall-owner', 'staff'), getLicenseTierById)
  .patch(verifyJWT, authorizeRoles('super-admin'), updateLicenseTier)
  .delete(verifyJWT, authorizeRoles('super-admin'), deleteLicenseTier);

export default router;