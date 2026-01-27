import nodemailer from 'nodemailer';
import notificationQueue from '../queues/notification.queue.js';

const emailProcessor = async (job) => {
  const { email, subject, html, attachments, notification } = job.data;

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
      to: email,
      subject,
      html,
      attachments,
    };

    console.log(`[EmailWorker] Attempting to send email to ${email}...`);
    await transporter.sendMail(mailOptions);
    console.log(`[EmailWorker] Email sent to ${email}`);

    if (notification) {
      await notificationQueue.add('sendNotification', {
        recipient: notification.recipient,
        message: notification.message,
        link: notification.link,
      });
    }
  } catch (error) {
    console.error(`[EmailWorker] Email sending failed for ${email}:`, error);
    throw error; // Let BullMQ handle retries
  }
};

export default emailProcessor;
