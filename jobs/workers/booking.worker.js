import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import bookingProcessor from '../processors/booking.processor.js';
import logger from '../../utils/logger.js';

const bookingWorker = new Worker('bookingQueue', bookingProcessor, {
  connection: redisConnection,
  concurrency: 2,
});

bookingWorker.on('completed', (job) => {
  logger.info(`[BookingWorker] Job ${job.id} completed`);
});

bookingWorker.on('failed', (job, err) => {
  logger.error(`[BookingWorker] Job ${job.id} failed: ${err.message}`);
});

export default bookingWorker;
