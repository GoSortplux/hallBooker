import Notification from '../../models/notification.model.js';
import logger from '../../utils/logger.js';

const notificationProcessor = async (job) => {
  const { recipient, message, link } = job.data;

  try {
    const notification = await Notification.create({
      recipient,
      message,
      link,
    });

    logger.info(`[NotificationWorker] Notification created for recipient: ${recipient}`);

    // In a real multi-process setup, we'd emit the socket event here
    // using a Redis adapter for Socket.io or another mechanism.
    // For now, we focus on the DB persistence.
    return notification;
  } catch (error) {
    logger.error(`[NotificationWorker] Error creating notification: ${error}`);
    throw error;
  }
};

export default notificationProcessor;
