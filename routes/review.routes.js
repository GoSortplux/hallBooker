import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
    createReview,
    getReviewsForHall,
    deleteReview
} from '../controllers/review.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Hall reviews and ratings
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
 *         hall:
 *           $ref: '#/components/schemas/Hall'
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
 *           example: 5
 *         comment:
 *           type: string
 *           example: "This was a great hall for our event!"
 */

/**
 * @swagger
 * /api/v1/reviews/hall/{hallId}/booking/{bookingId}:
 *   post:
 *     summary: Create a new review for a hall booking
 *     description: "Users can only review a hall for a specific booking that is completed and paid. Users can only review a booking once."
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *       - in: path
 *         name: bookingId
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109cb"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewInput'
 *     responses:
 *       201:
 *         description: Review created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Review'
 *                 message:
 *                   type: string
 *                   example: "Review created successfully"
 *       403:
 *         description: You are not eligible to review this hall for this booking.
 * /api/v1/reviews/hall/{hallId}:
 *   get:
 *     summary: Get all reviews for a specific hall
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: hallId
 *         schema:
 *           type: string
 *         required: true
 *         example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: A list of reviews for the hall.
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
 *                     $ref: '#/components/schemas/Review'
 *                 message:
 *                   type: string
 *                   example: "Reviews fetched successfully"
 */
router.route('/hall/:hallId/booking/:bookingId')
    .post(verifyJWT, createReview);

router.route('/hall/:hallId')
    .get(getReviewsForHall);


/**
 * @swagger
 * /api/v1/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     description: "Super-admins can delete any review."
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the review to delete.
 *         example: "60d0fe4f5311236168a109d0"
 *     responses:
 *       200:
 *         description: Review deleted successfully.
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
 *                   example: "Review deleted successfully"
 *       403:
 *         description: You are not authorized to delete this review.
 *       404:
 *         description: Review not found.
 */
router.route('/:id')
    .delete(verifyJWT, authorizeRoles('super-admin'), deleteReview);

export default router;