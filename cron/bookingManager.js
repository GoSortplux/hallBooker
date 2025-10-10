import cron from 'node-cron';
import { Booking } from '../models/booking.model.js';
import Setting from '../models/setting.model.js';

const deletePendingBookings = async () => {
    console.log('Running pending bookings cleanup job...');

    try {
        let deletionTime = 30; // Default to 30 minutes
        const deletionTimeSetting = await Setting.findOne({ key: 'pendingBookingDeletionTime' });

        if (deletionTimeSetting && typeof deletionTimeSetting.value === 'number') {
            deletionTime = deletionTimeSetting.value;
        }

        const cutoffTime = new Date(Date.now() - deletionTime * 60 * 1000);

        const result = await Booking.deleteMany({
            paymentStatus: 'pending',
            createdAt: { $lt: cutoffTime },
        });

        if (result.deletedCount > 0) {
            console.log(`Successfully deleted ${result.deletedCount} pending bookings.`);
        } else {
            console.log('No pending bookings to delete.');
        }
    } catch (error) {
        console.error('Error deleting pending bookings:', error);
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