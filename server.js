import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import connectDB from './config/db.js';
import redisConnection from './config/redis.js';
import logger from './utils/logger.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import initializeCronJobs from './cron/licenseManager.js';
import initializeBookingCronJobs from './cron/bookingManager.js';
import initializeNotificationCronJobs from './cron/notificationManager.js';
import initializeReservationCronJobs from './cron/reservationManager.js';
import { scheduleReviewNotifications } from './cron/reviewNotification.js';
import initializeUserCleanupCronJob from './cron/userCleanupManager.js';

// Route Imports
import reservationRoutes from './routes/reservation.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import hallRoutes from './routes/hall.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import reviewRoutes from './routes/review.routes.js';
import userRoutes from './routes/user.routes.js';
import licenseRoutes from './routes/license.routes.js';
import licenseTierRoutes from './routes/licenseTier.routes.js';
import settingRoutes from './routes/setting.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import analyticsV2Routes from './routes/analytics.v2.routes.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import {
  emailQueue,
  notificationQueue,
  mediaQueue,
  analyticsQueue,
  pdfQueue,
  bookingQueue
} from './jobs/queues/index.js';
import paymentRoutes from './routes/payment.routes.js';
import subAccountRoutes from './routes/subaccount.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import locationRoutes from './routes/location.routes.js';
import facilityRoutes from './routes/facility.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import monnifyRoutes from './routes/monnify.routes.js';
import suitabilityRoutes from './routes/suitability.routes.js';
import policyRoutes from './routes/policy.routes.js';


// Load environment variables
dotenv.config();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [];

const app = express();

// Trust proxy for correct client IP detection (needed for rate limiting behind proxies like Coolify/Traefik)
app.set('trust proxy', 1);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

// WebSocket handshake validation here
io.use((socket, next) => {
  const origin = socket.handshake.headers.origin;

  if (!origin || allowedOrigins.includes(origin)) {
    next();
  } else {
    next(new Error('Forbidden WebSocket origin'));
  }
});


// Make io accessible to our router
app.set('io', io);

const port = process.env.PORT || 5000;


// Middleware

// Security Middlewares
app.use(helmet()); // Secure HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // stricter limit for auth routes
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

// CORS Configuration for multi-origin
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({
  limit: '16kb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());

// Serve Static Files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Bull Board Dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(notificationQueue),
    new BullMQAdapter(mediaQueue),
    new BullMQAdapter(analyticsQueue),
    new BullMQAdapter(pdfQueue),
    new BullMQAdapter(bookingQueue),
  ],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pending-hallowner-request', adminRoutes);
app.use('/api/v1/halls', hallRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/license-tiers', licenseTierRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v2/analytics', analyticsV2Routes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/subaccounts', subAccountRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/facilities', facilityRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', recommendationRoutes);
app.use('/api/v1/monnify', monnifyRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/suitabilities', suitabilityRoutes);
app.use('/api/v1/policies', policyRoutes);



// Fallback route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io connection
io.on('connection', (socket) => {
  logger.info(`a user connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(userId);
    logger.info(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    logger.info(`user disconnected: ${socket.id}`);
  });
});

// Only start the server if this file is run directly
const isMainModule = process.argv[1] &&
  (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
   path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'server.js'));

if (isMainModule && process.env.NODE_ENV !== 'test') {
  // Connect to MongoDB
  connectDB();

  // Initialize Cron Jobs
  initializeCronJobs(io);
  initializeBookingCronJobs(io);
  initializeNotificationCronJobs();
  scheduleReviewNotifications(io);
  initializeReservationCronJobs(io);
  initializeUserCleanupCronJob(io);

  const server = httpServer.listen(port, () => {
    logger.info(`🚀 Server running on port ${port}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} signal received: closing HTTP server`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        await redisConnection.quit();
        logger.info('Redis connection closed');
        process.exit(0);
      } catch (err) {
        logger.error(`Error during MongoDB connection close: ${err}`);
        process.exit(1);
      }
    });

    // Force close after 10s if graceful shutdown fails
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
