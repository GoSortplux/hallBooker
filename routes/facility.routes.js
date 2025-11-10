import { Router } from 'express';
import {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
} from '../controllers/facility.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Facilities
 *   description: API for managing hall facilities
 */

/**
 * @swagger
 * /api/v1/facilities:
 *   get:
 *     summary: Retrieve a list of all facilities
 *     tags: [Facilities]
 *     responses:
 *       '200':
 *         description: A list of facilities
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
 *                     $ref: '#/components/schemas/Facility'
 *                 message:
 *                   type: string
 *                   example: "Facilities retrieved successfully"
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.route('/').get(getAllFacilities);

/**
 * @swagger
 * /api/v1/facilities:
 *   post:
 *     summary: Create a new facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FacilityInput'
 *     responses:
 *       '201':
 *         description: Facility created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '400':
 *         description: Bad request (e.g., facility already exists)
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 */
router.route('/').post(verifyJWT, authorizeRoles(['super-admin']), createFacility);

/**
 * @swagger
 * /api/v1/facilities/{id}:
 *   get:
 *     summary: Get a facility by ID
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The facility ID
 *     responses:
 *       '200':
 *         description: Facility details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '404':
 *         description: Facility not found
 *   patch:
 *     summary: Update a facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The facility ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FacilityInput'
 *     responses:
 *       '200':
 *         description: Facility updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       '404':
 *         description: Facility not found
 *   delete:
 *     summary: Delete a facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The facility ID
 *     responses:
 *       '200':
 *         description: Facility deleted successfully
 *       '404':
 *         description: Facility not found
 */
router
  .route('/:id')
  .get(verifyJWT, authorizeRoles(['super-admin']), getFacilityById)
  .patch(verifyJWT, authorizeRoles(['super-admin']), updateFacility)
  .delete(verifyJWT, authorizeRoles(['super-admin']), deleteFacility);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Facility:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60c72b2f9b1d8c001f8e4c6a"
 *         name:
 *           type: string
 *           example: "Projector"
 *         chargeable:
 *           type: boolean
 *           example: true
 *         chargeMethod:
 *           type: string
 *           enum: [free, flat, per_hour]
 *           example: "flat"
 *         cost:
 *           type: number
 *           example: 50
 *
 *     FacilityInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Air Conditioning"
 *         chargeable:
 *           type: boolean
 *           example: false
 *         chargeMethod:
 *           type: string
 *           enum: [free, flat, per_hour]
 *           example: "free"
 *         cost:
 *           type: number
 *           example: 0
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *         data:
 *           $ref: '#/components/schemas/Facility'
 *         message:
 *           type: string
 *         success:
 *           type: boolean
 */
