import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
    purchaseOrRenewLicense, 
    getMyLicense,
    getLicenseForUser,
    getRecommendedTier,
    upgradeLicense
} from '../controllers/license.controller.js';

const router = Router();

router.use(verifyJWT);

router.route('/recommend')
    .get(authorizeRoles('venue-owner'), getRecommendedTier);

// Route for a venue owner to purchase/renew or view their own license
router.route('/my-license')
    .post(authorizeRoles('venue-owner'), purchaseOrRenewLicense)
    .get(authorizeRoles('venue-owner'), getMyLicense);

router.route('/upgrade')
    .post(authorizeRoles('venue-owner'), upgradeLicense);

// Route for a super admin to view a specific user's license
router.route('/user/:userId')
    .get(authorizeRoles('super-admin'), getLicenseForUser);


export default router;