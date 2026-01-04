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

    // 2. Send reminder notifications
    try {
        const reminderIntervals = [
            { hours: 72, name: '72-hour' },
            { hours: 24, name: '24-hour' },
            { hours: 6, name: '6-hour' }
        ];

        for (const interval of reminderIntervals) {
            const reminderWindowStart = new Date(now.getTime() + (interval.hours - 1) * 60 * 60 * 1000);
            const reminderWindowEnd = new Date(now.getTime() + interval.hours * 60 * 60 * 1000);

            const reservationsToRemind = await Reservation.find({
                status: 'ACTIVE',
                paymentStatus: 'pending',
                cutoffDate: {
                    $gte: reminderWindowStart,
                    $lt: reminderWindowEnd
                },
                remindersSent: { $ne: interval.name } // Check if this specific reminder has not been sent
            }).populate('user').populate('hall');

            for (const reservation of reservationsToRemind) {
                const customer = reservation.reservationType === 'walk-in' ? reservation.walkInUserDetails : reservation.user;
                if (customer && customer.email) {
                    sendEmail({
                        io,
                        email: customer.email,
                        subject: `Reminder: Action Required for Your Reservation at ${reservation.hall.name}`,
                        html: generateReservationReminderEmail(customer.fullName, reservation),
                        notification: {
                            recipient: reservation.user?._id.toString(),
                            message: `Your reservation for ${reservation.hall.name} is expiring soon. Complete your payment to confirm.`,
                            link: `/reservations/${reservation._id}`
                        }
                    }).catch(console.error);
                }

                reservation.remindersSent.push(interval.name);
                await reservation.save();
                console.log(`${interval.name} reminder sent for reservation ${reservation.reservationId}.`);
            }
        }
    } catch (error) {
        console.error('Error sending reservation reminders:', error);
    }
  });
};

export default reservationManager;
