import express from 'express';
import { getHallRecommendations } from '../controllers/recommendation.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/halls/{id}/recommendations:
 *   get:
 *     summary: Get hall recommendations
 *     description: Retrieves a list of halls similar to the one specified by the ID.
 *     tags: [Halls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the hall to get recommendations for.
 *     responses:
 *       200:
 *         description: A list of recommended halls.
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
 *                     $ref: '#/components/schemas/Hall'
 *                 message:
 *                   type: string
 *                   example: "Hall recommendations retrieved successfully"
 *                 success:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Hall not found.
 *       500:
 *         description: Internal server error.
 */
router.route('/halls/:id/recommendations').get(getHallRecommendations);

export default router;
