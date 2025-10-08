import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
    createReview, 
    getReviewsForVenue,
    updateReview,
    deleteReview
} from '../controllers/review.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Venue reviews and ratings
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *         venue:
 *           $ref: '#/components/schemas/Venue'
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *
 *     ReviewInput:
 *       type: object
 *       required: [rating, comment]
 *       properties:
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 */

/**
 * @swagger
 * /reviews/venue/{venueId}:
 *   get:
 *     summary: Get all reviews for a specific venue
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: venueId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: A list of reviews for the venue
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *   post:
 *     summary: Create a new review for a venue
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: venueId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewInput'
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       400:
 *         description: You have already reviewed this venue
 */
router.route('/venue/:venueId')
    .get(getReviewsForVenue)
    .post(verifyJWT, createReview);

/**
 * @swagger
 * /reviews/{id}:
 *   patch:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the review to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewInput'
 *     responses:
 *       200:
 *         description: Review updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the review to delete
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found
 */
router.route('/:id')
    .patch(verifyJWT, authorizeRoles('user'), updateReview)
    .delete(verifyJWT, authorizeRoles('user', 'super-admin'), deleteReview);

export default router;