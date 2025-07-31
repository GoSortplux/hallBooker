import express from 'express';
import { setCommissionRate, getCommissionRate } from '../controllers/setting.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Super Admin routes
router.post('/commission-rate', verifyJWT, authorizeRoles('super-admin'), setCommissionRate);
router.get('/commission-rate', verifyJWT, authorizeRoles('super-admin'), getCommissionRate);

export default router;
