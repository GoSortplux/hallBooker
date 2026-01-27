import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import emailProcessor from '../processors/email.processor.js';

const emailWorker = new Worker('emailQueue', emailProcessor, {
  connection: redisConnection,
  concurrency: 5,
});

emailWorker.on('completed', (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job ${job.id} failed:`, err);
});

export default emailWorker;
