import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateUserBankAccount,
    addStaff,
    getMyStaff,
    removeStaff
} from '../controllers/user.controller.js';

const router = Router();

// Route for users to update their own bank account
router.route('/bank-account')
    .patch(verifyJWT, authorizeRoles('venue-owner', 'user'), updateUserBankAccount);

router.route('/add-staff')
    .post(verifyJWT, authorizeRoles('venue-owner'), addStaff);

router.route('/my-staff')
    .get(verifyJWT, authorizeRoles('venue-owner'), getMyStaff);

router.route('/remove-staff/:staffId')
    .delete(verifyJWT, authorizeRoles('venue-owner'), removeStaff);

router.use(verifyJWT, authorizeRoles('super-admin'));

router.route('/')
    .get(getAllUsers);

router.route('/:id')
    .get(getUserById)
    .patch(updateUser)
    .delete(deleteUser);

export default router;