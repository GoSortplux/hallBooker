import cron from 'node-cron';
import { User } from '../models/user.model.js';
import logger from '../utils/logger.js';

const userCleanupManager = (io) => {
  // Schedule the job to run once a day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.debug('Running user cleanup job...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      const usersToDelete = await User.find({
        accountStatus: 'deactivated',
        deactivationDate: { $lte: sevenDaysAgo },
      });

      if (usersToDelete.length > 0) {
        logger.info(`Found ${usersToDelete.length} user(s) to permanently delete.`);
        for (const user of usersToDelete) {
          await User.findByIdAndDelete(user._id);
          logger.info(`Permanently deleted user: ${user.fullName} (${user.email})`);
        }
      }
    } catch (error) {
      logger.error(`Error during user cleanup job: ${error}`);
    }
  });
};

export default userCleanupManager;
