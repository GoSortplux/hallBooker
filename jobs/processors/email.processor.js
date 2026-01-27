import nodemailer from 'nodemailer';
import logger from '../../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const emailProcessor = async (job) => {
  const { email, subject, html, attachments, io, notification } = job.data;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Handle serialized Buffers in attachments
    const processedAttachments = attachments?.map(att => {
      if (att.content && typeof att.content === 'object' && att.content.type === 'Buffer') {
        return { ...att, content: Buffer.from(att.content.data) };
      }
      return att;
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html,
      attachments: processedAttachments,
    };

    logger.debug(`[EmailWorker] Attempting to send email to ${email}...`);
    await transporter.sendMail(mailOptions);
    logger.info(`[EmailWorker] Email sent to ${email}`);

    // If there's a socket notification to emit after email
    if (io && notification) {
      // Note: io might not be directly available in the worker process if it's separate.
      // We might need a different way to handle socket emissions from workers,
      // like another queue or a redis pub/sub.
      // For now, we'll assume the worker has access or we'll handle it via NotificationWorker.
    }
  } catch (error) {
    logger.error(`[EmailWorker] Email sending failed for ${email}: ${error}`);
    throw error; // Rethrow to trigger BullMQ retry
  }
};

export default emailProcessor;
