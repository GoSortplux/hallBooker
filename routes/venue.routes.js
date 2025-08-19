import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { checkActiveLicense } from '../middlewares/license.middleware.js'; // Import license middleware
import {
    createVenue,
    getAllVenues,
    getVenueById,
    updateVenue,
    deleteVenue,
    updateVenueMedia,
    deleteVenueMedia,
    getVenuesByOwner
} from '../controllers/venue.controller.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

// Public routes
router.route('/').get(getAllVenues);
router.route('/:id').get(getVenueById);

// Protected routes
router.use(verifyJWT);

// Route for venue owners to get their own venues
router.route('/by-owner').get(authorizeRoles('venue-owner'), getVenuesByOwner);

// Venue Owner & Super Admin routes
router.route('/')
    .post(authorizeRoles('venue-owner', 'super-admin'), checkActiveLicense, createVenue);

router.route('/:id')
    .put(authorizeRoles('venue-owner', 'super-admin'), checkActiveLicense, updateVenue)
    .delete(authorizeRoles('venue-owner', 'super-admin'), checkActiveLicense, deleteVenue);

// Route for uploading and deleting media for a venue
router.route('/:id/media')
    .patch(
        authorizeRoles('venue-owner', 'super-admin'),
        checkActiveLicense,
        upload.fields([
            { name: 'images', maxCount: 10 },
            { name: 'videos', maxCount: 5 }
        ]),
        updateVenueMedia
    )
    .delete(
        authorizeRoles('venue-owner', 'super-admin'),
        checkActiveLicense,
        deleteVenueMedia
    );

export default router; 

