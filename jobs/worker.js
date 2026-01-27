import '../config/env.js';
import connectDB from '../config/db.js';
import redisConnection from '../config/redis.js';

// Connect to MongoDB (needed for processors that touch models)
connectDB();

console.log('👷 Background Worker process starting...');

// Worker Imports
import './workers/email.worker.js';
import './workers/analytics.worker.js';
import './workers/pdf.worker.js';
import './workers/booking.worker.js';
import './workers/media.worker.js';

// Special case for NotificationWorker which needs Socket.io (optional)
// Note: If running in a separate process, we might not have the IO instance
// to emit real-time updates directly. We could use Redis adapter for Socket.io
// to broadcast from the worker process to the API process.
import createNotificationWorker from './workers/notification.worker.js';

// In a multi-process setup, the Worker process doesn't have the HTTP server's IO.
// For now, we initialize it with null. Real-time updates would require
// @socket.io/redis-adapter or similar.
createNotificationWorker(null);

console.log('✅ All workers initialized and listening for jobs.');

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Worker shutting down gracefully...`);

  // Close Redis connection
  await redisConnection.quit();
  console.log('Redis connection closed.');

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
