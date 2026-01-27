import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import notificationProcessor from '../processors/notification.processor.js';
import logger from '../../utils/logger.js';

const notificationWorker = new Worker('notificationQueue', notificationProcessor, {
  connection: redisConnection,
  concurrency: 10,
});

notificationWorker.on('completed', (job) => {
  logger.info(`[NotificationWorker] Job ${job.id} completed`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`[NotificationWorker] Job ${job.id} failed: ${err.message}`);
});

export default notificationWorker;
