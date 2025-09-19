import { Router } from 'express';
import { 
    registerUser, 
    loginUser, 
    forgotPassword, 
    resetPassword,
    verifyEmail,
    resendVerificationEmail
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.post('/verify-email', verifyJWT, verifyEmail);
router.post('/resend-verify-email', verifyJWT, resendVerificationEmail);

export default router;