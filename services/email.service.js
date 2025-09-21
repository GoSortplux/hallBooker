import nodemailer from 'nodemailer';
import { ApiError } from '../utils/apiError.js';

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.email,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new ApiError(500, "The email could not be sent.");
  }
};

export default sendEmail;