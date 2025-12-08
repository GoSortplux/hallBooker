import cron from 'node-cron';
import { Booking } from '../models/booking.model.js';
import Setting from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generatePendingBookingCancelledEmail } from '../utils/emailTemplates.js';

const deletePendingBookings = async (io) => {
    console.log('Running pending bookings cleanup job...');

    try {
        let deletionTime = 30; // Default to 30 minutes
        const deletionTimeSetting = await Setting.findOne({ key: 'pendingBookingDeletionTime' });

        if (deletionTimeSetting && typeof deletionTimeSetting.value === 'number') {
            deletionTime = deletionTimeSetting.value;
        }

        const cutoffTime = new Date(Date.now() - deletionTime * 60 * 1000);

        const expiredBookings = await Booking.find({
            paymentStatus: 'pending',
            createdAt: { $lt: cutoffTime },
        }).populate({
            path: 'hall',
            populate: {
                path: 'owner staff',
                select: 'email fullName _id',
            },
        }).populate('user', 'email fullName');

        if (expiredBookings.length === 0) {
            console.log('No pending bookings to delete.');
            return;
        }

        const adminUsers = await User.find({ role: 'super-admin' }).select('email fullName');
        const adminEmails = adminUsers.map(admin => ({ email: admin.email, name: admin.fullName }));

        for (const booking of expiredBookings) {
            try {
                const recipients = new Map();

                // Add user
                if (booking.user && booking.user.email) {
                    recipients.set(booking.user.email, booking.user.fullName);
                }

                // Add hall owner
                if (booking.hall && booking.hall.owner && booking.hall.owner.email) {
                    recipients.set(booking.hall.owner.email, booking.hall.owner.fullName);
                }

                // Add hall staff
                if (booking.hall && booking.hall.staff) {
                    booking.hall.staff.forEach(staffMember => {
                        if (staffMember && staffMember.email) {
                            recipients.set(staffMember.email, staffMember.fullName);
                        }
                    });
                }

                // Add admins
                adminEmails.forEach(admin => recipients.set(admin.email, admin.name));

                // Send email to all unique recipients
                for (const [email, name] of recipients.entries()) {
                    let recipientId;
                    if (booking.user && email === booking.user.email) {
                        recipientId = booking.user._id;
                    } else if (booking.hall.owner && email === booking.hall.owner.email) {
                        recipientId = booking.hall.owner._id;
                    } else {
                        const staffMember = booking.hall.staff.find(staff => staff.email === email);
                        if (staffMember) {
                            recipientId = staffMember._id;
                        } else {
                            const admin = adminUsers.find(admin => admin.email === email);
                            if (admin) {
                                recipientId = admin._id;
                            }
                        }
                    }

                    // Only create a notification if a recipient ID was found
                    const notificationPayload = recipientId
                        ? {
                            recipient: recipientId.toString(),
                            message: `Booking #${booking.bookingId} has been cancelled due to non-payment.`,
                            link: `/bookings/${booking._id}`,
                          }
                        : undefined;

                    await sendEmail({
                        io,
                        email,
                        subject: `Booking Cancelled: ${booking.bookingId}`,
                        html: generatePendingBookingCancelledEmail(name, booking),
                        notification: notificationPayload,
                    });
                }

                console.log(`Sent cancellation notifications for booking ${booking.bookingId}`);

                // Finally, delete the booking
                await Booking.findByIdAndDelete(booking._id);
                console.log(`Successfully deleted pending booking ${booking.bookingId}`);

            } catch (emailError) {
                console.error(`Error processing booking ${booking.bookingId}:`, emailError);
            }
        }
    } catch (error) {
        console.error('Error in pending bookings cleanup job:', error);
    }
};

const initializeBookingCronJobs = (io) => {
    // Schedule the cleanup task to run every minute
    cron.schedule('* * * * *', () => deletePendingBookings(io), {
        timezone: "Africa/Lagos"
    });

    console.log('🗓️  Cron job for pending bookings management has been scheduled.');
};

export default initializeBookingCronJobs;