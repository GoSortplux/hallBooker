import cron from 'node-cron';
import { Booking } from '../models/booking.model.js';
import Setting from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generatePendingBookingCancelledEmail } from '../utils/emailTemplates.js';

const deletePendingBookings = async () => {
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
                select: 'email fullName',
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
                } else if (booking.walkInUserDetails && booking.walkInUserDetails.email) {
                    recipients.set(booking.walkInUserDetails.email, booking.walkInUserDetails.fullName);
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
                    await sendEmail({
                        email,
                        subject: `Booking Cancelled: ${booking.bookingId}`,
                        html: generatePendingBookingCancelledEmail(name, booking),
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

const initializeBookingCronJobs = () => {
    // Schedule the cleanup task to run every minute
    cron.schedule('* * * * *', deletePendingBookings, {
        timezone: "Africa/Lagos"
    });

    console.log('🗓️  Cron job for pending bookings management has been scheduled.');
};

export default initializeBookingCronJobs;