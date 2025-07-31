import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';
import { 
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateUserBankAccount
} from '../controllers/user.controller.js';

const router = Router();

// Route for users to update their own bank account
router.route('/bank-account')
    .patch(verifyJWT, authorizeRoles('venue-owner', 'user'), updateUserBankAccount);

router.use(verifyJWT, authorizeRoles('super-admin'));

router.route('/')
    .get(getAllUsers);

router.route('/:id')
    .get(getUserById)
    .patch(updateUser)
    .delete(deleteUser);

export default router;