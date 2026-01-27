import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import analyticsProcessor from '../processors/analytics.processor.js';

const analyticsWorker = new Worker('analyticsQueue', analyticsProcessor, {
  connection: redisConnection,
  concurrency: 10,
});

analyticsWorker.on('completed', (job) => {
  console.log(`[AnalyticsWorker] Job ${job.id} completed`);
});

analyticsWorker.on('failed', (job, err) => {
  console.error(`[AnalyticsWorker] Job ${job.id} failed:`, err);
});

export default analyticsWorker;
