import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import notificationProcessor, { setIo } from '../processors/notification.processor.js';

const createNotificationWorker = (io) => {
  setIo(io);

  const notificationWorker = new Worker('notificationQueue', notificationProcessor, {
    connection: redisConnection,
    concurrency: 10,
  });

  notificationWorker.on('completed', (job) => {
    console.log(`[NotificationWorker] Job ${job.id} completed`);
  });

  notificationWorker.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job ${job.id} failed:`, err);
  });

  return notificationWorker;
};

export default createNotificationWorker;
