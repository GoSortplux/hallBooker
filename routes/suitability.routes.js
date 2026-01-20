import { Router } from 'express';
import {
  createSuitability,
  getAllSuitabilities,
  getSuitabilityById,
  updateSuitability,
  deleteSuitability,
} from '../controllers/suitability.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Suitabilities
 *   description: API for managing hall suitability categories (e.g., Wedding, Birthday)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Suitability:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the suitability category
 *           example: 60c72b2f9b1d8c001f8e4c6a
 *         name:
 *           type: string
 *           description: The name of the suitability category
 *           example: Wedding
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     SuitabilityInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the suitability category
 *           example: Birthday
 */

/**
 * @swagger
 * /api/v1/suitabilities:
 *   get:
 *     summary: Retrieve a list of all suitability categories
 *     tags: [Suitabilities]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of suitability categories
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
 *                     $ref: '#/components/schemas/Suitability'
 *                 message:
 *                   type: string
 *                   example: Suitability categories fetched successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.route('/').get(verifyJWT, getAllSuitabilities);

/**
 * @swagger
 * /api/v1/suitabilities:
 *   post:
 *     summary: Create a new suitability category
 *     tags: [Suitabilities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SuitabilityInput'
 *     responses:
 *       '201':
 *         description: Suitability category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Suitability'
 *                 message:
 *                   type: string
 *                   example: Suitability category created successfully
 *       '400':
 *         description: Bad request (e.g., name missing or already exists)
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden (Only super-admin can create)
 */
router.route('/').post(verifyJWT, authorizeRoles('super-admin'), createSuitability);

/**
 * @swagger
 * /api/v1/suitabilities/{id}:
 *   get:
 *     summary: Get a suitability category by ID
 *     tags: [Suitabilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The suitability category ID
 *     responses:
 *       '200':
 *         description: Suitability category details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Suitability'
 *                 message:
 *                   type: string
 *                   example: Suitability category fetched successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden (Only super-admin can access by ID)
 *       '404':
 *         description: Suitability category not found
 */
router.route('/:id').get(verifyJWT, authorizeRoles('super-admin'), getSuitabilityById);

/**
 * @swagger
 * /api/v1/suitabilities/{id}:
 *   patch:
 *     summary: Update a suitability category
 *     tags: [Suitabilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The suitability category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SuitabilityInput'
 *     responses:
 *       '200':
 *         description: Suitability category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Suitability'
 *                 message:
 *                   type: string
 *                   example: Suitability category updated successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden (Only super-admin can update)
 *       '404':
 *         description: Suitability category not found
 */
router.route('/:id').patch(verifyJWT, authorizeRoles('super-admin'), updateSuitability);

/**
 * @swagger
 * /api/v1/suitabilities/{id}:
 *   delete:
 *     summary: Delete a suitability category
 *     tags: [Suitabilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The suitability category ID
 *     responses:
 *       '200':
 *         description: Suitability category deleted successfully
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden (Only super-admin can delete)
 *       '404':
 *         description: Suitability category not found
 */
router.route('/:id').delete(verifyJWT, authorizeRoles('super-admin'), deleteSuitability);

export default router;
