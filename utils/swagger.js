/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         fullName:
 *           type: string
 *           description: The full name of the user
 *         email:
 *           type: string
 *           description: The email of the user
 *         phone:
 *           type: string
 *           description: The phone number of the user
 *         whatsappNumber:
 *           type: string
 *           description: The WhatsApp number of the user
 *         role:
 *           type: string
 *           enum: [user, owner, admin, super-admin, staff]
 *           description: The role of the user
 *         isEmailVerified:
 *           type: boolean
 *           description: Whether the user's email is verified
 *         avatar:
 *           type: string
 *           description: URL to the user's avatar
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was last updated
 *     AuthSuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             accessToken:
 *               type: string
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *     PaymentInitializationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             authorizationUrl:
 *               type: string
 *               format: uri
 *             accessCode:
 *               type: string
 *             reference:
 *               type: string
 *     PaymentVerificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *             booking:
 *               $ref: '#/components/schemas/Booking'
 */
