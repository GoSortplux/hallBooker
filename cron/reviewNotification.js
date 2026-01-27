import cron from 'node-cron';
import { Booking } from '../models/booking.model.js';
import { User } from '../models/user.model.js';
import { Hall } from '../models/hall.model.js';
import { createNotification } from '../services/notification.service.js';
import sendEmail from '../services/email.service.js';
import { generateReviewNotificationEmail } from '../utils/emailTemplates.js';
import logger from '../utils/logger.js';

const scheduleReviewNotifications = (io) => {
  cron.schedule('0 * * * *', async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find bookings where all bookingDates.endTime are older than 24 hours ago
      const bookings = await Booking.find({
        status: 'confirmed',
        paymentStatus: 'paid',
        reviewNotificationSent: false,
        bookingDates: {
          $not: {
            $elemMatch: { endTime: { $gte: twentyFourHoursAgo } }
          }
        }
      })
        .populate('user')
        .populate('hall');

      for (const booking of bookings) {
        const { user, hall } = booking;

        // If the hall has been deleted, we can't send a review notification.
        // Mark as sent and skip to avoid re-processing.
        if (!hall) {
          booking.reviewNotificationSent = true;
          await booking.save();
          continue;
        }

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
      logger.error(`Error sending review notifications: ${error}`);
    }
  });
};

export { scheduleReviewNotifications };