
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { connectDB } from './config/db.js';
import { createAuth } from './config/auth.js';
import { toNodeHandler } from 'better-auth/node';

import eventRoutes from './routes/eventRoutes.js';
import { verifyToken } from './middleware/verifyToken.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error('Blocked CORS origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Server health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event-8 Server is Running!',
  });
});

// Protected API test
app.get('/api/protected-test', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JWT authentication successful!',
    user: req.user,
  });
});

async function startServer() {
  try {
    // Connect MongoDB
    const db = await connectDB();

    // Initialize Better Auth
    const auth = createAuth(db);

    // Better Auth handler must come before express.json()
    app.all('/api/auth/*splat', toNodeHandler(auth));

    // Parse JSON request bodies
    app.use(express.json());

    // Attach database to requests
    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // Event routes
    app.use('/api/events', eventRoutes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      });
    });

    // Centralized error handler
    app.use((error, req, res, next) => {
      console.error('API Error:', error);

      if (res.headersSent) {
        return next(error);
      }

      if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        'body' in error
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format.',
        });
      }

      const statusCode = error.status || error.statusCode || 500;

      return res.status(statusCode).json({
        success: false,
        message:
          statusCode >= 500
            ? 'Internal Server Error'
            : error.message || 'Something went wrong!',
      });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
