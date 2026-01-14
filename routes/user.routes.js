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
    removeStaff,
    applyHallOwner,
    createHallOwner,
    approveHallOwner,
    promoteToHallOwner,
    getMe,
    requestAccountDeletion,
    getUserBankAccount
} from '../controllers/user.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserInput:
 *       type: object
 *       properties:
 *         fullName:
 *           type: string
 *         phone:
 *           type: string
 *         whatsappNumber:
 *           type: string
 *         avatar:
 *           type: string
 *           format: uri
 *     BankAccountInput:
 *       type: object
 *       required:
 *         - bankCode
 *         - accountNumber
 *       properties:
 *         bankCode:
 *           type: string
 *           example: "058"
 *         accountNumber:
 *           type: string
 *           example: "0123456789"
 *     StaffInput:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *       properties:
 *         fullName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         password:
 *           type: string
 *           format: password
 *         hallIds:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/v1/users/me/bank-details:
 *   patch:
 *     summary: Add or Update Hall Owner Bank Details (Hall Owner only)
 *     description: Allows a hall owner to add or update their bank account details. The details are verified with Monnify before being saved.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BankAccountInput'
 *     responses:
 *       200:
 *         description: Bank account details updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad Request - Invalid account details or missing fields.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a hall owner.
 *   get:
 *     summary: Get Hall Owner Bank Details (Hall Owner only)
 *     description: Allows a hall owner to retrieve their own bank account details.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank account details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a hall owner.
 *       404:
 *         description: Not Found - Bank account details not found.
 */
router.route('/me/bank-details')
    .get(verifyJWT, authorizeRoles('hall-owner'), getUserBankAccount)
    .patch(verifyJWT, authorizeRoles('hall-owner'), updateUserBankAccount);

/**
 * @swagger
 * /users/add-staff:
 *   post:
 *     summary: Add a staff member
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StaffInput'
 *     responses:
 *       201:
 *         description: Staff added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/add-staff')
    .post(verifyJWT, authorizeRoles('hall-owner'), addStaff);

/**
 * @swagger
 * /users/my-staff:
 *   get:
 *     summary: Get all staff members for the current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of staff members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/my-staff')
    .get(verifyJWT, authorizeRoles('hall-owner'), getMyStaff);

/**
 * @swagger
 * /users/remove-staff/{staffId}:
 *   delete:
 *     summary: Remove a staff member
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the staff member to remove
 *     responses:
 *       200:
 *         description: Staff removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Staff not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/remove-staff/:staffId')
    .delete(verifyJWT, authorizeRoles('hall-owner'), removeStaff);

/**
 * @swagger
 * /users/apply-hall-owner:
 *   post:
 *     summary: Apply to become a hall owner
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hasReadTermsOfService:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/apply-hall-owner')
    .post(verifyJWT, authorizeRoles('user'), applyHallOwner);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get the currently logged-in user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The user object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/me').get(verifyJWT, getMe);

/**
 * @swagger
 * /api/v1/users/request-deletion:
 *   post:
 *     summary: Request account deletion
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Allows a logged-in user to request that their account be deleted. This will place their account into a 'deletion-requested' state, pending admin approval.
 *     responses:
 *       200:
 *         description: Account deletion request submitted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 */
router.route('/request-deletion').post(verifyJWT, requestAccountDeletion);

// Admin routes
router.use(verifyJWT, authorizeRoles('super-admin'));

router.route('/create-hall-owner').post(createHallOwner);
router.route('/promote-to-hall-owner/:id').patch(promoteToHallOwner);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (super-admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.route('/')
    .get(getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID (super-admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: The user object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     summary: Update a user (super-admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete a user (super-admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.route('/:id')
    .get(getUserById)
    .patch(updateUser)
    .delete(deleteUser);

export default router;