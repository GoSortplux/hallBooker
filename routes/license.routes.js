import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
    purchaseOrRenewLicense, 
    getMyLicense,
    getLicenseForUser
} from '../controllers/license.controller.js';

const router = Router();

router.use(verifyJWT);

// Route for a venue owner to purchase/renew or view their own license
router.route('/my-license')
    .post(authorizeRoles('venue-owner'), purchaseOrRenewLicense)
    .get(authorizeRoles('venue-owner'), getMyLicense);

// Route for a super admin to view a specific user's license
router.route('/user/:userId')
    .get(authorizeRoles('super-admin'), getLicenseForUser);


export default router;