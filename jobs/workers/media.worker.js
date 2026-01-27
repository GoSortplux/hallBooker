import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import mediaProcessor from '../processors/media.processor.js';

const mediaWorker = new Worker('mediaQueue', mediaProcessor, {
  connection: redisConnection,
  concurrency: 5,
});

mediaWorker.on('completed', (job) => {
  console.log(`[MediaWorker] Job ${job.id} completed`);
});

mediaWorker.on('failed', (job, err) => {
  console.error(`[MediaWorker] Job ${job.id} failed:`, err);
});

export default mediaWorker;
