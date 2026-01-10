import { Router } from 'express';
import {
  getHallOwnerApplications,
  approveHallOwnerApplication,
  rejectHallOwnerApplication,
  addPaymentMethod,
  removePaymentMethod,
  addPaymentStatus,
  removePaymentStatus,
  getAllBookings,
  getBookingsForHall,
  getUserBankDetails,
  unlistHall,
  relistHall,
  getDeletionRequests,
  approveDeletionRequest,
  declineDeletionRequest,
  updateCompanyNameSetting,
} from '../controllers/admin.controller.js';
import { verifyJWT, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60d0fe4f5311236168a109cb"
 *         user:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *         hall:
 *           type: string
 *           example: "60d0fe4f5311236168a109cc"
 *         eventDetails:
 *           type: string
 *           example: "Wedding reception"
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2024-12-25T18:00:00.000Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2024-12-25T23:00:00.000Z"
 *         totalPrice:
 *           type: number
 *           example: 5000
 *         paymentMethod:
 *           type: string
 *           example: "online"
 *         paymentStatus:
 *           type: string
 *           example: "paid"
 *         status:
 *           type: string
 *           example: "confirmed"
 *         bookingId:
 *           type: string
 *           example: "BK12345678"
 *         bookedBy:
 *           type: string
 *           example: "60d0fe4f5311236168a109ca"
 *         bookingType:
 *           type: string
 *           example: "online"
 *         walkInUserDetails:
 *           type: object
 *           properties:
 *             fullName:
 *               type: string
 *               example: "John Doe"
 *             email:
 *               type: string
 *               example: "john.doe@example.com"
 *             phone:
 *               type: string
 *               example: "+1234567890"
 *         isRecurring:
 *           type: boolean
 *           example: false
 *         recurringBookingId:
 *           type: string
 *           example: "RB12345678"
 *         selectedFacilities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Projector"
 *               cost:
 *                 type: number
 *                 example: 100
 *               chargeMethod:
 *                 type: string
 *                 example: "per_hour"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-12-25T10:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-12-25T10:00:00.000Z"
 */
/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only operations
 */

/**
 * @swagger
 * /api/v1/admin/hall-owner-applications:
 *   get:
 *     summary: Retrieve a list of pending hall owner applications
 *     description: Fetches a list of users who have applied for the 'hall-owner' role and are awaiting approval. This endpoint is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of pending applications.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d0fe4f5311236168a109ca"
 *                       fullName:
 *                         type: string
 *                         example: "John Doe"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       phone:
 *                         type: string
 *                         example: "+1234567890"
 *                       hallOwnerApplication:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                 message:
 *                   type: string
 *                   example: "Pending hall owner applications retrieved successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 *       404:
 *         description: No pending hall owner applications found.
 */
router
  .route('/hall-owner-applications')
  .get(verifyJWT, authorizeRoles('super-admin'), getHallOwnerApplications);

/**
 * @swagger
 * /api/v1/admin/hall-owner-applications/{userId}/approve:
 *   patch:
 *     summary: Approve a hall owner application
 *     description: Approves a pending application for a user to become a 'hall-owner'. This action changes the user's status to 'approved'. Restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose application is being approved.
 *     responses:
 *       200:
 *         description: Application approved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Hall owner application approved successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 *       404:
 *         description: User not found.
 */
router
  .route('/hall-owner-applications/:userId/approve')
  .patch(verifyJWT, authorizeRoles('super-admin'), approveHallOwnerApplication);

/**
 * @swagger
 * /api/v1/admin/hall-owner-applications/{userId}/reject:
 *   patch:
 *     summary: Reject a hall owner application
 *     description: Rejects a pending application for a user to become a 'hall-owner'. This action changes the user's status to 'rejected'. Restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose application is being rejected.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: "Incomplete application."
 *     responses:
 *       200:
 *         description: Application rejected successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Hall owner application rejected successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 *       404:
 *         description: User not found.
 */
router
    .route('/hall-owner-applications/:userId/reject')
    .patch(verifyJWT, authorizeRoles('super-admin'), rejectHallOwnerApplication)

/**
 * @swagger
 * /api/v1/admin/payment-methods:
 *   post:
 *     summary: Add a new payment method
 *     description: Adds a new payment method to the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 example: "crypto"
 *     responses:
 *       200:
 *         description: Payment method added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["cash", "pos", "bank-transfer", "online", "crypto"]
 *                 message:
 *                   type: string
 *                   example: "Payment method added successfully"
 *       400:
 *         description: Bad Request - Payment method is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router.route('/payment-methods').post(verifyJWT, authorizeRoles('super-admin'), addPaymentMethod);
router.route('/payment-methods/remove').post(verifyJWT, authorizeRoles('super-admin'), removePaymentMethod);

/**
 * @swagger
 * /api/v1/admin/payment-methods/remove:
 *   post:
 *     summary: Remove a payment method
 *     description: Removes a payment method from the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 example: "crypto"
 *     responses:
 *       200:
 *         description: Payment method removed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["cash", "pos", "bank-transfer", "online"]
 *                 message:
 *                   type: string
 *                   example: "Payment method removed successfully"
 *       400:
 *         description: Bad Request - Payment method is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
// Routes for managing payment statuses
/**
 * @swagger
 * /api/v1/admin/payment-statuses:
 *   post:
 *     summary: Add a new payment status
 *     description: Adds a new payment status to the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentStatus]
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 example: "refunded"
 *     responses:
 *       200:
 *         description: Payment status added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["pending", "paid", "failed", "refunded"]
 *                 message:
 *                   type: string
 *                   example: "Payment status added successfully"
 *       400:
 *         description: Bad Request - Payment status is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router.route('/payment-statuses').post(verifyJWT, authorizeRoles('super-admin'), addPaymentStatus);

/**
 * @swagger
 * /api/v1/admin/payment-statuses/remove:
 *   post:
 *     summary: Remove a payment status
 *     description: Removes a payment status from the list of available options. This is restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentStatus]
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 example: "refunded"
 *     responses:
 *       200:
 *         description: Payment status removed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["pending", "paid", "failed"]
 *                 message:
 *                   type: string
 *                   example: "Payment status removed successfully"
 *       400:
 *         description: Bad Request - Payment status is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router.route('/payment-statuses/remove').post(verifyJWT, authorizeRoles('super-admin'), removePaymentStatus);

/**
 * @swagger
 * /api/v1/admin/bookings:
 *   get:
 *     summary: Retrieve all bookings
 *     description: Fetches a paginated list of all bookings across the platform. Restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: The number of bookings to retrieve per page.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: The field to sort by.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: The sort order.
 *       - in: query
 *         name: hall
 *         schema:
 *           type: string
 *         description: The ID of the hall to filter by.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: The status to filter by.
 *     responses:
 *       200:
 *         description: A list of bookings.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                 message:
 *                   type: string
 *                   example: "Bookings retrieved successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router
  .route('/bookings')
  .get(verifyJWT, authorizeRoles('super-admin'), getAllBookings);

/**
 * @swagger
 * /api/v1/admin/halls/{hallId}/bookings:
 *   get:
 *     summary: Retrieve bookings for a specific hall
 *     description: Fetches a paginated list of all bookings for a specific hall. Restricted to super-admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the hall.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: The number of bookings to retrieve per page.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: The field to sort by.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: The sort order.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: The status to filter by.
 *     responses:
 *       200:
 *         description: A list of bookings for the specified hall.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                 message:
 *                   type: string
 *                   example: "Bookings for hall retrieved successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 */
router
    .route('/halls/:hallId/bookings')
    .get(verifyJWT, authorizeRoles('super-admin'), getBookingsForHall);

/**
 * @swagger
 * /api/v1/admin/users/{userId}/bank-details:
 *   get:
 *     summary: Get a user's bank details (Super Admin only)
 *     description: Fetches the bank account number, bank code, and account name for a specific user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose bank details are to be retrieved.
 *     responses:
 *       200:
 *         description: User's bank details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     accountNumber:
 *                       type: string
 *                       example: "0123456789"
 *                     bankCode:
 *                       type: string
 *                       example: "058"
 *                     accountName:
 *                       type: string
 *                       example: "John Doe"
 *                 message:
 *                   type: string
 *                   example: "User bank details retrieved successfully"
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User does not have the required 'super-admin' role.
 *       404:
 *         description: User not found or user has no bank details.
 */
router
    .route('/users/:userId/bank-details')
    .get(verifyJWT, authorizeRoles('super-admin'), getUserBankDetails);

/**
 * @swagger
 * /api/v1/admin/halls/{hallId}/unlist:
 *   patch:
 *     summary: Unlist a hall
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Allows a super-admin to unlist a hall, making it unavailable for new bookings.
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the hall to unlist.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "The hall is under renovation."
 *     responses:
 *       200:
 *         description: Hall unlisted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad Request - Reason is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 *       404:
 *         description: Hall not found.
 */
router.route('/halls/:hallId/unlist').patch(verifyJWT, authorizeRoles('super-admin'), unlistHall);

/**
 * @swagger
 * /api/v1/admin/halls/{hallId}/relist:
 *   patch:
 *     summary: Relist a hall
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Allows a super-admin to relist a previously unlisted hall, making it available for new bookings.
 *     parameters:
 *       - in: path
 *         name: hallId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the hall to relist.
 *     responses:
 *       200:
 *         description: Hall relisted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 *       404:
 *         description: Hall not found.
 */
router.route('/halls/:hallId/relist').patch(verifyJWT, authorizeRoles('super-admin'), relistHall);

/**
 * @swagger
 * /api/v1/admin/deletion-requests:
 *   get:
 *     summary: Get all account deletion requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieves a list of all users who have requested their accounts to be deleted.
 *     responses:
 *       200:
 *         description: A list of users with pending deletion requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 *       404:
 *         description: No pending deletion requests found.
 */
router.route('/deletion-requests').get(verifyJWT, authorizeRoles('super-admin'), getDeletionRequests);

/**
 * @swagger
 * /api/v1/admin/deletion-requests/{userId}/approve:
 *   patch:
 *     summary: Approve an account deletion request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Approves a user's request to delete their account. This deactivates the account, which will be permanently deleted after a grace period.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose deletion request is being approved.
 *     responses:
 *       200:
 *         description: Account deletion request approved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 *       404:
 *         description: User not found.
 */
router.route('/deletion-requests/:userId/approve').patch(verifyJWT, authorizeRoles('super-admin'), approveDeletionRequest);

/**
 * @swagger
 * /api/v1/admin/deletion-requests/{userId}/decline:
 *   patch:
 *     summary: Decline an account deletion request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Declines a user's request to delete their account. This reactivates the user's account.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose deletion request is being declined.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "The user has outstanding bookings."
 *     responses:
 *       200:
 *         description: Account deletion request declined successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad Request - Reason is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 *       404:
 *         description: User not found.
 */
router.route('/deletion-requests/:userId/decline').patch(verifyJWT, authorizeRoles('super-admin'), declineDeletionRequest);

/**
 * @swagger
 * /api/v1/admin/settings/company-name:
 *   patch:
 *     summary: Update the company name
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Allows a super-admin to set or update the company name, which is used across the application (e.g., in watermarks).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: "Gobokin"
 *     responses:
 *       200:
 *         description: Company name updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Bad Request - Company name is required.
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       403:
 *         description: Forbidden - User is not a super-admin.
 */
router.route('/settings/company-name').patch(verifyJWT, authorizeRoles('super-admin'), updateCompanyNameSetting);

export default router;
