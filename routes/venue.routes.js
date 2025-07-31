import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { checkActiveLicense } from '../middlewares/license.middleware.js'; // Import license middleware
import { 
    createVenue, 
    getAllVenues, 
    getVenueById, 
    updateVenue, 
    deleteVenue 
} from '../controllers/venue.controller.js';

const router = Router();

// Public routes are unaffected
router.route('/').get(getAllVenues);
router.route('/:id').get(getVenueById);

// Apply protection to all subsequent routes in this file
router.use(verifyJWT); 

// Venue Owner & Admin routes now require a valid license
router.route('/')
    .post(authorizeRoles('venue-owner', 'super-admin'), checkActiveLicense, createVenue);

router.route('/:id')
    .put(authorizeRoles('venue-owner', 'super-admin'), checkActiveLicense, updateVenue)
    .delete(authorizeRoles('venue-owner', 'super-admin'), checkActiveLicense, deleteVenue);

export default router; 