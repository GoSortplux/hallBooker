import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
    createBooking, 
    getMyBookings,
    getBookingById,
    getBookingByBookingId,
    updateBookingDetails,
    cancelBooking 
} from '../controllers/booking.controller.js';

const router = Router();

router.use(verifyJWT);

router.route('/')
    .post(createBooking);

router.route('/my-bookings')
    .get(getMyBookings);
    
router.route('/search/:bookingId')
    .get(authorizeRoles('user', 'venue-owner', 'super-admin'), getBookingByBookingId);

router.route('/:id')
    .get(authorizeRoles('user', 'venue-owner', 'super-admin'), getBookingById)
    .patch(authorizeRoles('user'), updateBookingDetails)
    .put(authorizeRoles('user', 'super-admin'), cancelBooking); // PUT for status change

export default router;