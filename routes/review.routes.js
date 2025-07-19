import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
    createReview, 
    getReviewsForVenue,
    updateReview,
    deleteReview
} from '../controllers/review.controller.js';

const router = Router();

router.route('/venue/:venueId')
    .get(getReviewsForVenue)
    .post(verifyJWT, createReview);

router.route('/:id')
    .patch(verifyJWT, authorizeRoles('user'), updateReview)
    .delete(verifyJWT, authorizeRoles('user', 'super-admin'), deleteReview);

export default router;