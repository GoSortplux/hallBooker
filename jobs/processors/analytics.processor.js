import { Analytics } from '../../models/analytics.model.js';
import { Hall } from '../../models/hall.model.js';
import logger from '../../utils/logger.js';

const analyticsProcessor = async (job) => {
  const { hallId, type, userId, ipAddress } = job.data;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const analyticsQuery = {
      hall: hallId,
      type,
      ...(userId ? { user: userId } : { ipAddress }),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    const alreadyTrackedToday = await Analytics.findOne(analyticsQuery);

    if (!alreadyTrackedToday) {
      await Analytics.create({
        hall: hallId,
        type,
        ...(userId ? { user: userId } : { ipAddress }),
      });

      if (type === 'view') {
        await Hall.findByIdAndUpdate(hallId, { $inc: { views: 1 } });
      } else if (type === 'demo-booking') {
        await Hall.findByIdAndUpdate(hallId, { $inc: { demoBookings: 1 } });
      }

      logger.info(`[AnalyticsWorker] Tracked ${type} for hall ${hallId}`);
    }
  } catch (error) {
    logger.error(`[AnalyticsWorker] Error tracking analytics: ${error}`);
    throw error;
  }
};

export default analyticsProcessor;
