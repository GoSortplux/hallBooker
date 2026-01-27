import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import pdfProcessor from '../processors/pdf.processor.js';

const pdfWorker = new Worker('pdfQueue', pdfProcessor, {
  connection: redisConnection,
  concurrency: 5,
});

pdfWorker.on('completed', (job) => {
  console.log(`[PdfWorker] Job ${job.id} completed`);
});

pdfWorker.on('failed', (job, err) => {
  console.error(`[PdfWorker] Job ${job.id} failed:`, err);
});

export default pdfWorker;
