import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
    purchaseSubscription,
    upgradeSubscription,
    getMyCurrentSubscription,
    getMySubscriptionHistory,
    getSubscriptionHistoryForUser,
    getRecommendedTier
} from '../controllers/license.controller.js';

const router = Router();

router.use(verifyJWT);

router.route('/recommend')
    .get(authorizeRoles('venue-owner'), getRecommendedTier);

router.route('/')
    .post(authorizeRoles('venue-owner'), purchaseSubscription);

router.route('/upgrade')
    .post(authorizeRoles('venue-owner'), upgradeSubscription);

router.route('/my-subscription')
    .get(authorizeRoles('venue-owner'), getMyCurrentSubscription);

router.route('/my-history')
    .get(authorizeRoles('venue-owner'), getMySubscriptionHistory);

router.route('/user/:userId/history')
    .get(authorizeRoles('super-admin'), getSubscriptionHistoryForUser);


export default router;