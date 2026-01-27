import Notification from '../../models/notification.model.js';

let ioInstance = null;

export const setIo = (io) => {
  ioInstance = io;
};

const notificationProcessor = async (job) => {
  const { recipient, message, link } = job.data;

  try {
    const notification = await Notification.create({
      recipient,
      message,
      link,
    });

    if (ioInstance) {
      ioInstance.to(recipient).emit('new_notification', notification);
      console.log(`[NotificationWorker] Socket notification sent to ${recipient}`);
    } else {
      console.warn('[NotificationWorker] IO instance not set, skipping socket emit');
    }
  } catch (error) {
    console.error(`[NotificationWorker] Error creating notification for ${recipient}:`, error);
    throw error;
  }
};

export default notificationProcessor;
