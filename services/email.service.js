import { emailQueue } from '../jobs/queues/index.js';
import logger from '../utils/logger.js';

/**
 * Pushes an email job to the email queue for background processing.
 * @param {Object} options - Email options (email, subject, html, etc.)
 */
const sendEmail = async (options) => {
  try {
    const { io, notification, ...emailOptions } = options;

    // Push job to BullMQ queue
    await emailQueue.add('sendEmail', {
      ...emailOptions,
      notification,
    });

    logger.debug(`Email job added to queue for ${emailOptions.email}`);
  } catch (error) {
    logger.error(`Error adding email to queue: ${error}`);
    // We don't want to throw here to avoid breaking the main request flow
    // as email is now secondary.
  }
};

export default sendEmail;