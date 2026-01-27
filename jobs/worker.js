import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Connect to Database
await connectDB();

// Import all workers to start them
import './workers/email.worker.js';
import './workers/notification.worker.js';
import './workers/media.worker.js';
import './workers/analytics.worker.js';
import './workers/pdf.worker.js';
import './workers/booking.worker.js';

logger.info('⚙️ Background Worker Process Started Successfully');

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`[Worker] ${signal} received, shutting down...`);
  // Workers will close their own connections if we had a more complex setup,
  // but BullMQ handles most of it.
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
