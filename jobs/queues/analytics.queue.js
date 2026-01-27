import { Queue } from 'bullmq';
import redisConnection from '../../config/redis.js';

const analyticsQueue = new Queue('analyticsQueue', {
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

export default analyticsQueue;
