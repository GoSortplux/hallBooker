import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import analyticsProcessor from '../processors/analytics.processor.js';
import logger from '../../utils/logger.js';

const analyticsWorker = new Worker('analyticsQueue', analyticsProcessor, {
  connection: redisConnection,
  concurrency: 20,
});

analyticsWorker.on('completed', (job) => {
  logger.info(`[AnalyticsWorker] Job ${job.id} completed`);
});

analyticsWorker.on('failed', (job, err) => {
  logger.error(`[AnalyticsWorker] Job ${job.id} failed: ${err.message}`);
});

export default analyticsWorker;
