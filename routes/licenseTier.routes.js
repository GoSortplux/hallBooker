import { Router } from 'express';
import {
  createLicenseTier,
  getAllLicenseTiers,
  getLicenseTierById,
  updateLicenseTier,
  deleteLicenseTier,
} from '../controllers/licenseTier.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// All routes in this file are protected and restricted to super-admins
router.use(verifyJWT, authorizeRoles('super-admin'));

router.route('/')
  .post(createLicenseTier)
  .get(getAllLicenseTiers);

router.route('/:id')
  .get(getLicenseTierById)
  .patch(updateLicenseTier)
  .delete(deleteLicenseTier);

export default router;
