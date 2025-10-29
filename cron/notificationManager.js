import cron from 'node-cron';
import Notification from '../models/notification.model.js';

const deleteReadNotifications = async () => {
  console.log('Running daily check for read notifications to delete...');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const result = await Notification.deleteMany({
      read: true,
      readAt: { $lte: thirtyDaysAgo },
    });
    if (result.deletedCount > 0) {
      console.log(`Deleted ${result.deletedCount} read notifications.`);
    } else {
      console.log('No read notifications to delete.');
    }
  } catch (err) {
    console.error('Failed to delete read notifications', err);
  }
};

const initializeCronJobs = () => {
  // Schedule the task to run once a day at 3 AM
  cron.schedule('0 3 * * *', deleteReadNotifications, {
    timezone: "Africa/Lagos"
  });

  console.log('🗓️  Cron job for deleting read notifications has been scheduled.');
};

export default initializeCronJobs;
