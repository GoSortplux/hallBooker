import nodemailer from 'nodemailer';
import { ApiError } from '../utils/apiError.js';

const sendEmail = async (options) => {
  const { io, notification, ...emailOptions } = options;
  try {
    console.log('--- Email Config For Debugging ---');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('Secure:', process.env.EMAIL_SECURE);
    console.log('---------------------------------');

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

    console.log('Attempting to send email...');
    await transporter.sendMail(mailOptions);
    console.log('Email sent!');
    if (io && notification) {
      io.to(notification.recipient).emit('notification', {
        message: notification.message,
        link: notification.link
      });
    }
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new ApiError(500, "The email could not be sent.");
  }
};

export default sendEmail;