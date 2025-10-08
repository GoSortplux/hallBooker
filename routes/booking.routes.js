import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import {
    createRecurringBooking,
    createBooking,
    walkInBooking,
    getMyBookings,
    getBookingById,
    getBookingByBookingId,
    updateBookingDetails,
    cancelBooking,
} from '../controllers/booking.controller.js';

const router = Router();

router.use(verifyJWT);

router.route('/recurring').post(createRecurringBooking);

router.route('/')
    .post(createBooking);

router.route('/walk-in')
    .post(authorizeRoles('staff', 'venue-owner', 'super-admin'), walkInBooking);

router.route('/my-bookings')
    .get(getMyBookings);
    
router.route('/search/:bookingId')
    .get(authorizeRoles('user', 'venue-owner', 'super-admin'), getBookingByBookingId);

router.route('/:id')
    .get(authorizeRoles('user', 'venue-owner', 'super-admin'), getBookingById)
    .patch(authorizeRoles('user'), updateBookingDetails)
    .put(authorizeRoles('user', 'super-admin'), cancelBooking); // PUT for status change

export default router;