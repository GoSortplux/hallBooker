import { Router } from 'express';
import {
  getPolicies,
  getPolicyBySlug,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../controllers/policy.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validation.middleware.js';
import { createPolicySchema, updatePolicySchema } from '../validations/policy.validation.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Policies
 *   description: Legal and Privacy Policy management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Policy:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *         title:
 *           type: string
 *           example: "Gobokin Privacy Policy"
 *         slug:
 *           type: string
 *           example: "privacy-policy"
 *         content:
 *           type: string
 *           description: "Markdown content of the policy"
 *           example: "# Privacy Policy\n\nYour data is safe."
 *         version:
 *           type: integer
 *           example: 1
 *         effectiveDate:
 *           type: string
 *           format: date-time
 *           example: "2026-01-01T00:00:00.000Z"
 *         isPublished:
 *           type: boolean
 *           example: true
 *         createdBy:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/policies:
 *   get:
 *     summary: Get all published and effective policies
 *     description: Returns a list of the latest published versions of all unique policies that have reached their effective date.
 *     tags: [Policies]
 *     responses:
 *       200:
 *         description: A list of policies
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
 *                       title:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       effectiveDate:
 *                         type: string
 *                         format: date-time
 *                       version:
 *                         type: integer
 *                 message:
 *                   type: string
 *                   example: "Policies retrieved successfully"
 *                 success:
 *                   type: boolean
 *                   example: true
 *   post:
 *     summary: Create a new policy or a new version of an existing policy (Super Admin only)
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - content
 *               - effectiveDate
 *             properties:
 *               title:
 *                 type: string
 *                 example: "User Agreement"
 *               slug:
 *                 type: string
 *                 example: "user-agreement"
 *               content:
 *                 type: string
 *                 example: "# User Agreement\n\nTerms go here..."
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-01-01T00:00:00.000Z"
 *               isPublished:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Policy created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Super Admin role required
 */

/**
 * @swagger
 * /api/v1/policies/{slug}:
 *   get:
 *     summary: Get a specific policy by its slug
 *     description: Returns the latest published and effective version of the policy identified by the slug.
 *     tags: [Policies]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: "privacy-policy"
 *     responses:
 *       200:
 *         description: The policy document
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Policy not found or not yet effective
 */

/**
 * @swagger
 * /api/v1/policies/{id}:
 *   patch:
 *     summary: Update an existing policy version (Super Admin only)
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the policy version to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Policy updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Policy version not found
 *   delete:
 *     summary: Delete a specific policy version (Super Admin only)
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the policy version to delete
 *     responses:
 *       200:
 *         description: Policy version deleted successfully
 *       404:
 *         description: Policy version not found
 */

// Public routes
router.route('/').get(getPolicies);
router.route('/:slug').get(getPolicyBySlug);

// Admin routes
router.use(verifyJWT);
router.use(authorizeRoles('super-admin'));

router.route('/')
  .post(validate(createPolicySchema), createPolicy);

router.route('/:id')
  .patch(validate(updatePolicySchema), updatePolicy)
  .delete(deletePolicy);

export default router;
