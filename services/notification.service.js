import { notificationQueue } from '../jobs/queues/index.js';
import logger from '../utils/logger.js';

/**
 * Pushes a notification job to the notification queue for background processing.
 * @param {Object} io - The socket.io instance (kept for compatibility, though emission may happen in worker).
 * @param {string} recipient - The ID of the user who should receive the notification.
 * @param {string} message - The notification message.
 * @param {string} [link] - An optional link to include with the notification.
 */
export const createNotification = async (io, recipient, message, link) => {
  try {
    await notificationQueue.add('createNotification', {
      recipient,
      message,
      link,
    });

    logger.debug(`Notification job added to queue for recipient: ${recipient}`);

    // For immediate UI feedback, we might still want to emit a socket event here if possible,
    // but the actual DB record and heavy lifting is now in the worker.
  } catch (error) {
    logger.error(`Error adding notification to queue: ${error}`);
  }
};