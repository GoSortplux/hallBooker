import cron from 'node-cron';
import { Reservation } from '../models/reservation.model.js';
import sendEmail from '../services/email.service.js';
import { generateReservationExpiredEmail, generateReservationReminderEmail } from '../utils/emailTemplates.js';

const reservationManager = (io) => {
  // Schedule a job to run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running reservation manager cron job...');

    const now = new Date();

    // 1. Handle expired reservations
    try {
      const expiredReservations = await Reservation.find({
        status: 'ACTIVE',
        cutoffDate: { $lt: now }
      }).populate('user').populate('hall');

      for (const reservation of expiredReservations) {
        reservation.status = 'EXPIRED';
        await reservation.save();

        console.log(`Reservation ${reservation._id} has expired.`);

        const customer = reservation.reservationType === 'walk-in' ? reservation.walkInUserDetails : reservation.user;
        if (customer && customer.email) {
            sendEmail({
                io,
                email: customer.email,
                subject: `Your Reservation for ${reservation.hall.name} Has Expired`,
                html: generateReservationExpiredEmail(customer.fullName, reservation),
                notification: {
                    recipient: reservation.user?._id.toString(),
                    message: `Your reservation for ${reservation.hall.name} has expired.`,
                    link: `/reservations/${reservation._id}`
                }
            }).catch(console.error);
        }
      }
    } catch (error) {
        console.error('Error processing expired reservations:', error);
    }

    // 2. Send reminder notifications (72 hours before cutoff)
    try {
        const reminderWindowStart = new Date(now.getTime() + 71 * 60 * 60 * 1000); // 71 hours from now
        const reminderWindowEnd = new Date(now.getTime() + 72 * 60 * 60 * 1000);   // 72 hours from now

        const reservationsToRemind = await Reservation.find({
            status: 'ACTIVE',
            cutoffDate: {
                $gte: reminderWindowStart,
                $lt: reminderWindowEnd
            },
            'remindersSent.0': { $exists: false } // Check if a reminder has not been sent
        }).populate('user').populate('hall');

        for (const reservation of reservationsToRemind) {
            const customer = reservation.reservationType === 'walk-in' ? reservation.walkInUserDetails : reservation.user;
            if (customer && customer.email) {
                 sendEmail({
                    io,
                    email: customer.email,
                    subject: `Reminder: Your Reservation for ${reservation.hall.name} is Expiring Soon`,
                    html: generateReservationReminderEmail(customer.fullName, reservation),
                    notification: {
                        recipient: reservation.user?._id.toString(),
                        message: `Your reservation for ${reservation.hall.name} is expiring soon.`,
                        link: `/reservations/${reservation._id}`
                    }
                }).catch(console.error);
            }

            reservation.remindersSent.push(new Date());
            await reservation.save();
            console.log(`Reminder sent for reservation ${reservation._id}.`);
        }
    } catch (error) {
        console.error('Error sending reservation reminders:', error);
    }
  });
};

export default reservationManager;
