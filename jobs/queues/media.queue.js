import { Queue } from 'bullmq';
import redisConnection from '../../config/redis.js';

const mediaQueue = new Queue('mediaQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export default mediaQueue;
