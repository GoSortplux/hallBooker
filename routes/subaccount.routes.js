import { Router } from 'express';
import { createSubAccount } from '../controllers/subaccount.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/')
    .post(verifyJWT, authorizeRoles('super-admin'), createSubAccount);

export default router;