import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { getSuperAdminAnalytics, getVenueOwnerAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

router.use(verifyJWT);

router.route('/super-admin').get(authorizeRoles('super-admin'), getSuperAdminAnalytics);
router.route('/venue-owner').get(authorizeRoles('venue-owner'), getVenueOwnerAnalytics);

export default router;
