import { Queue } from 'bullmq';
import redisConnection from '../../config/redis.js';
import { defaultQueueOptions } from './config.js';

export const emailQueue = new Queue('emailQueue', {
  connection: redisConnection,
  ...defaultQueueOptions,
});

export const notificationQueue = new Queue('notificationQueue', {
  connection: redisConnection,
  ...defaultQueueOptions,
});

export const mediaQueue = new Queue('mediaQueue', {
  connection: redisConnection,
  ...defaultQueueOptions,
});

export const analyticsQueue = new Queue('analyticsQueue', {
  connection: redisConnection,
  ...defaultQueueOptions,
});

export const pdfQueue = new Queue('pdfQueue', {
  connection: redisConnection,
  ...defaultQueueOptions,
});

export const bookingQueue = new Queue('bookingQueue', {
  connection: redisConnection,
  ...defaultQueueOptions,
});
