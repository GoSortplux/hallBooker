import emailQueue from '../jobs/queues/email.queue.js';

/**
 * Pushes an email job to the queue.
 * @param {Object} options - Email options including recipient, subject, html, attachments, and optional notification data.
 */
const sendEmail = async (options) => {
  const { io, notification, ...emailOptions } = options;

  try {
    // emailOptions typically contains: email, subject, html, attachments
    await emailQueue.add('sendEmail', {
      email: emailOptions.email,
      subject: emailOptions.subject,
      html: emailOptions.html,
      attachments: emailOptions.attachments,
      notification,
    });
    console.log(`[EmailService] Email job queued for ${emailOptions.email}`);
  } catch (error) {
    console.error("[EmailService] Failed to queue email:", error);
    // We don't throw ApiError here to avoid breaking the request-response cycle
    // for something that should be backgrounded.
  }
};

export default sendEmail;
