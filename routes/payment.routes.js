import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { makePayment, verifyPayment } from '../controllers/payment.controller.js';

const router = Router();

router.route('/initialize/:bookingId').post(verifyJWT, makePayment);
router.route('/verify').get(verifyPayment);
router.route('/verify/:transactionReference').get(verifyPayment);


export default router;
