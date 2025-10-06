import { Router } from 'express';
import { verifyJWT, authorizeRoles, authorizeVenueAccess } from '../middlewares/auth.middleware.js';
import { checkActiveLicense } from '../middlewares/license.middleware.js'; // Import license middleware
import {
    createVenue,
    getAllVenues,
    getVenueById,
    updateVenue,
    deleteVenue,
    addVenueMedia,
    deleteVenueMedia,
    replaceVenueMedia,
    getVenuesByOwner,
    generateCloudinarySignature,
} from '../controllers/venue.controller.js';

const router = Router();

// Public routes
router.route('/').get(getAllVenues);
router.route('/:id').get(getVenueById);

// Protected routes
router.use(verifyJWT);

// Route for venue owners to get their own venues
router.route('/by-owner').get(authorizeRoles('venue-owner', 'staff'), getVenuesByOwner);

// Venue Owner & Super Admin routes
router.route('/')
    .post(authorizeRoles('venue-owner', 'super-admin'), checkActiveLicense, createVenue);

router.route('/:id')
    .put(authorizeVenueAccess, checkActiveLicense, updateVenue)
    .delete(authorizeVenueAccess, checkActiveLicense, deleteVenue);

// Route for generating a cloudinary signature
router.route('/media/generate-signature')
    .post(authorizeRoles('venue-owner', 'staff', 'super-admin'), generateCloudinarySignature);

// Routes for managing venue media
router.route('/:id/media')
    .post(authorizeVenueAccess, checkActiveLicense, addVenueMedia)
    .delete(authorizeVenueAccess, checkActiveLicense, deleteVenueMedia);

router.route('/:id/media/replace')
    .put(authorizeVenueAccess, checkActiveLicense, replaceVenueMedia);

export default router; 

