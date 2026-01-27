import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import bookingProcessor from '../processors/booking.processor.js';

const bookingWorker = new Worker('bookingQueue', bookingProcessor, {
  connection: redisConnection,
  concurrency: 2, // Bulk creation can be heavy
});

bookingWorker.on('completed', (job) => {
  console.log(`[BookingWorker] Job ${job.id} completed`);
});

bookingWorker.on('failed', (job, err) => {
  console.error(`[BookingWorker] Job ${job.id} failed:`, err);
});

export default bookingWorker;
