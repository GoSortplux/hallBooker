import cron from 'node-cron';
import { Reservation } from '../models/reservation.model.js';
import Setting from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generateReservationExpiredEmail, generateReservationReminderEmail, generatePendingReservationCancelledEmail } from '../utils/emailTemplates.js';
import { createNotification } from '../services/notification.service.js';


const reservationManager = (io) => {
  // Schedule a job to run every minute to check for expired pending reservations
  cron.schedule('* * * * *', async () => {
    console.log('Running cron job to clean up expired pending reservations...');

    try {
        const setting = await Setting.findOne({ key: 'pendingReservationExpiryMinutes' });
        const pendingReservationExpiryMinutes = setting ? setting.value : 30; // Default to 30 minutes

        const cutoffTime = new Date(Date.now() - pendingReservationExpiryMinutes * 60 * 1000);

        const expiredPendingReservations = await Reservation.find({
            status: 'ACTIVE',
            paymentStatus: 'pending',
            createdAt: { $lt: cutoffTime }
        }).populate('user').populate({
            path: 'hall',
            populate: {
                path: 'owner',
                model: 'User'
            }
        });


        if (expiredPendingReservations.length > 0) {
            console.log(`Found ${expiredPendingReservations.length} expired pending reservations to clean up.`);
        }

        for (const reservation of expiredPendingReservations) {
            const customer = reservation.reservationType === 'walk-in' ? reservation.walkInUserDetails : reservation.user;

            // If the hall has been deleted, just remove the reservation and move on.
            if (!reservation.hall) {
                await Reservation.findByIdAndDelete(reservation._id);
                console.log(`Deleted expired pending reservation ${reservation.reservationId} for non-existent hall.`);
                continue;
            }

            const hallOwner = reservation.hall.owner;
            const superAdmins = await User.find({ role: { $in: ['super-admin'] } });

            // Delete the reservation
            await Reservation.findByIdAndDelete(reservation._id);
            console.log(`Deleted expired pending reservation ${reservation.reservationId}.`);

            // Notify the customer
            if (customer && customer.email) {
                sendEmail({
                    io,
                    email: customer.email,
                    subject: `Reservation for ${reservation.hall.name} Cancelled`,
                    html: generatePendingReservationCancelledEmail({
                        customerName: customer.fullName,
                        reservationId: reservation.reservationId,
                        hallName: reservation.hall.name,
                        reason: 'The reservation was not paid for within the allowed time.'
                    }),
                    // No in-app notification for the user who's reservation is deleted
                }).catch(err => console.error(`Error sending cancellation email to customer for reservation ${reservation.reservationId}:`, err));
            }

            // Notify hall owner and super-admins
            const recipients = [hallOwner, ...superAdmins].filter(Boolean); // Filter out null/undefined
            for (const recipient of recipients) {
                if (recipient && recipient.email) {
                     sendEmail({
                        io,
                        email: recipient.email,
                        subject: `An Unpaid Reservation for ${reservation.hall.name} Has Been Cancelled`,
                        html: generatePendingReservationCancelledEmail({
                            customerName: recipient.fullName, // Use recipient's name for their email
                            reservationId: reservation.reservationId,
                            hallName: reservation.hall.name,
                            reason: `The reservation made by ${customer.fullName} was automatically cancelled because it was not paid for within the ${pendingReservationExpiryMinutes}-minute window.`
                        }),
                        notification: {
                           recipient: recipient._id.toString(),
                           message: `An unpaid reservation (${reservation.reservationId}) for ${reservation.hall.name} has been auto-cancelled.`,
                           link: `/admin/reservations` // Generic link for admins/owners
                        }
                    }).catch(err => console.error(`Error sending cancellation email to ${recipient.email} for reservation ${reservation.reservationId}:`, err));
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up expired pending reservations:', error);
    }
  });


  // Schedule a job to run every hour for other reservation management tasks
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly reservation manager cron job...');

    const now = new Date();

    // 1. Handle expired reservations (status: ACTIVE -> EXPIRED)
    try {
      const expiredReservations = await Reservation.find({
        status: 'ACTIVE',
        cutoffDate: { $lt: now }
      }).populate('user').populate('hall');

      for (const reservation of expiredReservations) {
        reservation.status = 'EXPIRED';
        await reservation.save();

        console.log(`Reservation ${reservation._id} has expired.`);

        // If hall is deleted, we can't send a proper notification with hall details.
        if (!reservation.hall) {
            continue;
        }

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
                // If hall is deleted, skip reminders.
                if (!reservation.hall) {
                    continue;
                }

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
