
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

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event-8 Server is Running!',
  });
});

app.get('/api/protected-test', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JWT authentication successful!',
    user: req.user,
  });
});

async function startServer() {
  try {
    const db = await connectDB();
    const auth = createAuth(db);

    // Better Auth handler must come before express.json()
    app.all('/api/auth/*splat', toNodeHandler(auth));

    app.use(express.json());

    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    app.use('/api/events', eventRoutes);

    // Handle unknown routes
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      });
    });

    // Centralized error handling
    app.use((error, req, res, next) => {
      console.error('API Error:', error);

      if (res.headersSent) {
        return next(error);
      }

      // Handle invalid JSON
      if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        'body' in error
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format. Please check your request body.',
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
