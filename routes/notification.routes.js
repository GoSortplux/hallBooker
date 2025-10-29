import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markAsUnread,
} from '../controllers/notification.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management
 */

router.use(verifyJWT);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of notifications and the unread count.
 *       401:
 *         description: Unauthorized
 */
router.route('/').get(getNotifications);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read.
 *       401:
 *         description: Unauthorized
 */
router.route('/read-all').post(markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/read:
 *   post:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the notification to mark as read.
 *     responses:
 *       200:
 *         description: The notification was marked as read.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found.
 */
router.route('/:notificationId/read').post(markAsRead);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/unread:
 *   post:
 *     summary: Mark a single notification as unread
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the notification to mark as unread.
 *     responses:
 *       200:
 *         description: The notification was marked as unread.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found.
 */
router.route('/:notificationId/unread').post(markAsUnread);

export default router;