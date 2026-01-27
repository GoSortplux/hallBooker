import './config/env.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import initializeCronJobs from './cron/licenseManager.js';
import initializeBookingCronJobs from './cron/bookingManager.js';
import initializeNotificationCronJobs from './cron/notificationManager.js';
import initializeReservationCronJobs from './cron/reservationManager.js';
import { scheduleReviewNotifications } from './cron/reviewNotification.js';
import initializeUserCleanupCronJob from './cron/userCleanupManager.js';

import redisConnection from './config/redis.js';

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
import paymentRoutes from './routes/payment.routes.js';
import subAccountRoutes from './routes/subaccount.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import locationRoutes from './routes/location.routes.js';
import facilityRoutes from './routes/facility.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import monnifyRoutes from './routes/monnify.routes.js';
import suitabilityRoutes from './routes/suitability.routes.js';
import { verifyJWT, authorizeRoles } from './middlewares/auth.middleware.js';
import bullBoardAdapter from './config/bullboard.js';

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [];

// Connect to MongoDB
connectDB();

const app = express();
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

// Initialize Cron Jobs
initializeCronJobs(io);
initializeBookingCronJobs(io);
initializeNotificationCronJobs();
scheduleReviewNotifications(io);
initializeReservationCronJobs(io);
initializeUserCleanupCronJob(io);

// Middleware

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

// Bull Board Monitoring (Super Admin Only)
app.use('/admin/queues', verifyJWT, authorizeRoles('super-admin'), bullBoardAdapter.getRouter());

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



// Fallback route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  httpServer.close(async () => {
    console.log('HTTP server closed.');

    console.log('Closing Redis connection...');
    await redisConnection.quit();

    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
