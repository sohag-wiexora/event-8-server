
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

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Event-8 Server is Running!',
  });
});

// JWT authentication test
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

    // Parse JSON request body
    app.use(express.json());

    // Attach database to request
    app.use((req, res, next) => {
      req.db = db;
      next();
    });

    // Event API routes
    app.use('/api/events', eventRoutes);

    // Handle unknown routes
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
      });
    });

    // Centralized error handling middleware
    app.use((error, req, res, next) => {
      console.error('API Error:', error);

      // Check if response has already been sent
      if (res.headersSent) {
        return next(error);
      }

      // Handle invalid JSON request body
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

      // Determine HTTP status code
      const statusCode = error.status || error.statusCode || 500;

      // Send consistent error response
      return res.status(statusCode).json({
        success: false,
        message:
          statusCode >= 500
            ? 'Internal Server Error'
            : error.message || 'Something went wrong!',
      });
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
