import cron from 'node-cron';
import { User } from '../models/user.model.js';

const userCleanupManager = (io) => {
  // Schedule the job to run once a day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running user cleanup job...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      const usersToDelete = await User.find({
        accountStatus: 'deactivated',
        deactivationDate: { $lte: sevenDaysAgo },
      });

      if (usersToDelete.length > 0) {
        console.log(`Found ${usersToDelete.length} user(s) to permanently delete.`);
        for (const user of usersToDelete) {
          await User.findByIdAndDelete(user._id);
          console.log(`Permanently deleted user: ${user.fullName} (${user.email})`);
        }
      } else {
        console.log('No deactivated users older than 7 days to delete.');
      }
    } catch (error) {
      console.error('Error during user cleanup job:', error);
    }
  });
};

export default userCleanupManager;
