import nodemailer from 'nodemailer';
import { ApiError } from '../utils/apiError.js';
import logger from '../utils/logger.js';

const sendEmail = async (options) => {
  const { io, notification, ...emailOptions } = options;
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

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: emailOptions.email,
      subject: emailOptions.subject,
      html: emailOptions.html,
      attachments: emailOptions.attachments,
    };

    logger.debug('Attempting to send email...');
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${emailOptions.email}`);
    if (io && notification) {
      io.to(notification.recipient).emit('notification', {
        message: notification.message,
        link: notification.link
      });
    }
  } catch (error) {
    logger.error(`Email sending failed: ${error}`);
    throw new ApiError(500, "The email could not be sent.");
  }
};

export default sendEmail;