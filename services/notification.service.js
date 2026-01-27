import notificationQueue from '../jobs/queues/notification.queue.js';

/**
 * Pushes a notification job to the queue.
 * @param {Object} io - (Deprecated) The socket.io instance (now handled by worker).
 * @param {string} recipient - The ID of the user who should receive the notification.
 * @param {string} message - The notification message.
 * @param {string} [link] - An optional link to include with the notification.
 */
export const createNotification = async (io, recipient, message, link) => {
  try {
    await notificationQueue.add('sendNotification', {
      recipient,
      message,
      link,
    });
    console.log(`[NotificationService] Notification job queued for ${recipient}`);
  } catch (error) {
    console.error('[NotificationService] Error queuing notification:', error);
  }
};
