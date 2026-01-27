import { Queue } from 'bullmq';
import redisConnection from '../../config/redis.js';

const emailQueue = new Queue('emailQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
  },
});

export default emailQueue;
