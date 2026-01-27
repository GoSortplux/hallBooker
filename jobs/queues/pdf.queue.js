import { Queue } from 'bullmq';
import redisConnection from '../../config/redis.js';

const pdfQueue = new Queue('pdfQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { age: 24 * 3600 },
  },
});

export default pdfQueue;
