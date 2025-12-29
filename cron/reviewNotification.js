import cron from 'node-cron';
import { Booking } from '../models/booking.model.js';
import { User } from '../models/user.model.js';
import { Hall } from '../models/hall.model.js';
import { createNotification } from '../services/notification.service.js';
import sendEmail from '../services/email.service.js';
import { generateReviewNotificationEmail } from '../utils/emailTemplates.js';

const scheduleReviewNotifications = (io) => {
  cron.schedule('0 * * * *', async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const bookings = await Booking.find({
        endTime: { $lt: twentyFourHoursAgo },
        paymentStatus: 'paid',
        reviewNotificationSent: false,
      })
        .populate('user')
        .populate('hall');

      for (const booking of bookings) {
        const { user, hall } = booking;

        // If there's no user associated with the booking (e.g., a walk-in), skip.
        if (!user) {
          continue;
        }

        const reviewLink = `${process.env.FRONTEND_URL}/halls/${hall._id}/review`;

        await createNotification(
          io,
          user._id.toString(),
          `We hope you enjoyed your event at ${hall.name}! Please take a moment to share your experience.`,
          reviewLink
        );

        const emailBody = generateReviewNotificationEmail(user.fullName, hall.name, reviewLink);
        await sendEmail({
          email: user.email,
          subject: `Leave a review for ${hall.name}`,
          html: emailBody,
        });

        booking.reviewNotificationSent = true;
        await booking.save();
      }
    } catch (error) {
      console.error('Error sending review notifications:', error);
    }
  });
};

export { scheduleReviewNotifications };