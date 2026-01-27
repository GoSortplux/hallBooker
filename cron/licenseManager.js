import cron from 'node-cron';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { Hall } from '../models/hall.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generateSubscriptionExpiryWarningEmail, generateSubscriptionExpiredEmail } from '../utils/emailTemplates.js';
import { getCompanyName } from '../utils/settings.js';
import logger from '../utils/logger.js';

const sendExpirationWarnings = async (io) => {
    logger.debug('Running subscription expiration warning check...');
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingExpirations = await SubscriptionHistory.find({
        status: 'active',
        expiryDate: {
            $lte: sevenDaysFromNow,
            $gt: new Date()
        }
    }).populate('owner', 'email fullName').populate('tier', 'name');

    const companyName = await getCompanyName();
    for (const sub of upcomingExpirations) {
        try {
            await sendEmail({
                io,
                email: sub.owner.email,
                subject: `Your ${companyName} Subscription is Expiring Soon`,
                html: generateSubscriptionExpiryWarningEmail(sub.owner.fullName, sub.tier.name, sub.expiryDate, companyName),
                notification: {
                    recipient: sub.owner._id.toString(),
                    message: `Your ${sub.tier.name} subscription is expiring soon.`,
                },
            });
            logger.info(`Expiration warning sent to ${sub.owner.email}`);
        } catch (err) {
            logger.error(`Failed to send expiration warning to ${sub.owner.email}: ${err}`);
        }
    }
};

const deactivateExpiredSubscriptions = async (io) => {
    logger.debug('Running daily subscription deactivation check...');
    const expiredSubscriptions = await SubscriptionHistory.find({
        expiryDate: { $ne: null, $lt: new Date() },
        status: 'active'
    }).populate('owner', 'email fullName').populate('tier', 'name');

    const companyName = await getCompanyName();
    for (const sub of expiredSubscriptions) {
        sub.status = 'expired';
        await sub.save();
        logger.info(`Subscription for owner ${sub.owner.fullName} has been marked as expired.`);

        await Hall.updateMany({ owner: sub.owner._id }, { $set: { isActive: false } });
        logger.info(`Deactivated halls for owner ${sub.owner.fullName}.`);

        try {
            await sendEmail({
                io,
                email: sub.owner.email,
                subject: `Your ${companyName} Subscription Has Expired`,
                html: generateSubscriptionExpiredEmail(sub.owner.fullName, sub.tier.name, companyName),
                notification: {
                    recipient: sub.owner._id.toString(),
                    message: `Your ${sub.tier.name} subscription has expired.`,
                },
            });
        } catch (err) {
            logger.error(`Failed to send expiration email to ${sub.owner.email}: ${err}`);
        }
    }
};

const initializeCronJobs = (io) => {
    // Schedule the deactivation task to run once a day at 2 AM
    cron.schedule('0 2 * * *', () => deactivateExpiredSubscriptions(io), {
        timezone: "Africa/Lagos"
    });

    // Schedule the warning task to run once a day at 9 AM
    cron.schedule('0 9 * * *', () => sendExpirationWarnings(io), {
        timezone: "Africa/Lagos"
    });

    logger.info('🗓️ Cron jobs for subscription management have been scheduled.');
};

export default initializeCronJobs;