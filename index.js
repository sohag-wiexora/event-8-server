
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

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/api/protected-test', verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'JWT authentication successful!',
    user: req.user,
  });
});

app.get('/', (req, res) => {
  res.send('Event-8 Server is Running!');
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

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
