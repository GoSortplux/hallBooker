import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import mediaProcessor from '../processors/media.processor.js';
import logger from '../../utils/logger.js';

const mediaWorker = new Worker('mediaQueue', mediaProcessor, {
  connection: redisConnection,
  concurrency: 2, // Watermarking is CPU intensive
});

mediaWorker.on('completed', (job) => {
  logger.info(`[MediaWorker] Job ${job.id} completed`);
});

mediaWorker.on('failed', (job, err) => {
  logger.error(`[MediaWorker] Job ${job.id} failed: ${err.message}`);
});

export default mediaWorker;
