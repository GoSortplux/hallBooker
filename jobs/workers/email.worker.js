import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import emailProcessor from '../processors/email.processor.js';
import logger from '../../utils/logger.js';

const emailWorker = new Worker('emailQueue', emailProcessor, {
  connection: redisConnection,
  concurrency: 5,
});

emailWorker.on('completed', (job) => {
  logger.info(`[EmailWorker] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`[EmailWorker] Job ${job.id} failed: ${err.message}`);
});

export default emailWorker;
