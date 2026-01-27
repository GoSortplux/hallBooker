import { Analytics } from '../../models/analytics.model.js';
import { Hall } from '../../models/hall.model.js';

const analyticsProcessor = async (job) => {
  const { hallId, type, userId, ipAddress } = job.data;

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

  try {
    const existingLog = await Analytics.findOne(analyticsQuery);

    if (!existingLog) {
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
      console.log(`[AnalyticsWorker] Tracked ${type} for hall ${hallId}`);
    }
  } catch (error) {
    console.error(`[AnalyticsWorker] Error tracking ${type} for hall ${hallId}:`, error);
    throw error;
  }
};

export default analyticsProcessor;
