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
 *   name: License Tiers
 *   description: Management of license tiers (Super Admin only)
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
 *         maxVenues:
 *           type: number
 *
 *     LicenseTierInput:
 *       type: object
 *       required: [name, price, durationInDays, features, maxVenues]
 *       properties:
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
 *         maxVenues:
 *           type: number
 */

router.use(verifyJWT, authorizeRoles('super-admin'));

/**
 * @swagger
 * /license-tiers:
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
 *         description: License tier created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LicenseTier'
 *   get:
 *     summary: Get all license tiers (Super Admin only)
 *     tags: [License Tiers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of license tiers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LicenseTier'
 */
router.route('/')
  .post(createLicenseTier)
  .get(getAllLicenseTiers);

/**
 * @swagger
 * /license-tiers/{id}:
 *   get:
 *     summary: Get a license tier by ID (Super Admin only)
 *     tags: [License Tiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: The license tier object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LicenseTier'
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LicenseTierInput'
 *     responses:
 *       200:
 *         description: License tier updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LicenseTier'
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
 *     responses:
 *       200:
 *         description: License tier deleted successfully
 *       404:
 *         description: License tier not found
 */
router.route('/:id')
  .get(getLicenseTierById)
  .patch(updateLicenseTier)
  .delete(deleteLicenseTier);

export default router;