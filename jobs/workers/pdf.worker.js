import { Worker } from 'bullmq';
import redisConnection from '../../config/redis.js';
import pdfProcessor from '../processors/pdf.processor.js';
import logger from '../../utils/logger.js';

const pdfWorker = new Worker('pdfQueue', pdfProcessor, {
  connection: redisConnection,
  concurrency: 5,
});

pdfWorker.on('completed', (job) => {
  logger.info(`[PdfWorker] Job ${job.id} completed`);
});

pdfWorker.on('failed', (job, err) => {
  logger.error(`[PdfWorker] Job ${job.id} failed: ${err.message}`);
});

export default pdfWorker;
