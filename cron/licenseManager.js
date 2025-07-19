import cron from 'node-cron';
import { License } from '../models/license.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';

const checkAndDeactivateExpiredLicenses = async () => {
  console.log('Running daily license expiration check...');
  
  const expiredLicenses = await License.find({
    expiryDate: { $ne: null, $lt: new Date() },
    status: 'active'
  }).populate('owner', 'email fullName');

  for (const license of expiredLicenses) {
    license.status = 'expired';
    await license.save();
    console.log(`License for owner ${license.owner.fullName} has been marked as expired.`);

    try {
        await sendEmail({
            email: license.owner.email,
            subject: 'Your HallBooker License Has Expired',
            html: `<p>Hi ${license.owner.fullName},</p><p>Your license for HallBooker has expired. To continue managing your venues, please renew your license.</p>`
        });
    } catch(err) {
        console.error(`Failed to send expiration email to ${license.owner.email}`, err);
    }
  }
};

const initializeCronJobs = () => {
    // Schedule the task to run once a day at 2 AM
    cron.schedule('0 2 * * *', checkAndDeactivateExpiredLicenses, {
        timezone: "Africa/Lagos"
    });
    console.log('🗓️  Cron job for license management has been scheduled.');
};

export default initializeCronJobs;