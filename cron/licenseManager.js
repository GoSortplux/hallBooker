import cron from 'node-cron';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { Venue } from '../models/venue.model.js';
import { User } from '../models/user.model.js';
import sendEmail from '../services/email.service.js';
import { generateSubscriptionExpiryWarningEmail } from '../utils/emailTemplates.js';

const sendExpirationWarnings = async () => {
    console.log('Running subscription expiration warning check...');
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingExpirations = await SubscriptionHistory.find({
        status: 'active',
        expiryDate: {
            $lte: sevenDaysFromNow,
            $gt: new Date()
        }
    }).populate('owner', 'email fullName').populate('tier', 'name');

    for (const sub of upcomingExpirations) {
        try {
            await sendEmail({
                email: sub.owner.email,
                subject: 'Your HallBooker Subscription is Expiring Soon',
                html: generateSubscriptionExpiryWarningEmail(sub.owner.fullName, sub.tier.name, sub.expiryDate),
            });
            console.log(`Expiration warning sent to ${sub.owner.email}`);
        } catch (err) {
            console.error(`Failed to send expiration warning to ${sub.owner.email}`, err);
        }
    }
};

const deactivateExpiredSubscriptions = async () => {
    console.log('Running daily subscription deactivation check...');
    const expiredSubscriptions = await SubscriptionHistory.find({
        expiryDate: { $ne: null, $lt: new Date() },
        status: 'active'
    }).populate('owner', 'email fullName');

    for (const sub of expiredSubscriptions) {
        sub.status = 'expired';
        await sub.save();
        console.log(`Subscription for owner ${sub.owner.fullName} has been marked as expired.`);

        await Venue.updateMany({ owner: sub.owner._id }, { $set: { isActive: false } });
        console.log(`Deactivated venues for owner ${sub.owner.fullName}.`);

        try {
            await sendEmail({
                email: sub.owner.email,
                subject: 'Your HallBooker Subscription Has Expired',
                html: `<p>Hi ${sub.owner.fullName},</p><p>Your subscription for HallBooker has expired. Your venues have been deactivated and are no longer available for booking. Please renew your subscription to reactivate them.</p>`
            });
        } catch (err) {
            console.error(`Failed to send expiration email to ${sub.owner.email}`, err);
        }
    }
};

const initializeCronJobs = () => {
    // Schedule the deactivation task to run once a day at 2 AM
    cron.schedule('0 2 * * *', deactivateExpiredSubscriptions, {
        timezone: "Africa/Lagos"
    });

    // Schedule the warning task to run once a day at 9 AM
    cron.schedule('0 9 * * *', sendExpirationWarnings, {
        timezone: "Africa/Lagos"
    });

    console.log('🗓️  Cron jobs for subscription management have been scheduled.');
};

export default initializeCronJobs;