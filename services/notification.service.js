import Notification from '../models/notification.model.js';

/**
 * Create a new notification and emit a socket event.
 * @param {Object} io - The socket.io instance.
 * @param {string} recipient - The ID of the user who should receive the notification.
 * @param {string} message - The notification message.
 * @param {string} [link] - An optional link to include with the notification.
 */
export const createNotification = async (io, recipient, message, link) => {
  try {
    const notification = await Notification.create({
      recipient,
      message,
      link,
    });

    // Emit a socket event to the recipient
    io.to(recipient).emit('new_notification', notification);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};