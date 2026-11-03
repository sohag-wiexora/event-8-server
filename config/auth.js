import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { jwt } from 'better-auth/plugins';

export function createAuth(db) {
  // Frontend domains থেকে trusted origins তৈরি
  const trustedOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Required environment variables যাচাই
  if (!process.env.BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_URL is not configured.');
  }

  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not configured.');
  }

  if (!db) {
    throw new Error('MongoDB database connection is not available.');
  }

  return betterAuth({
    // Database configuration
    database: mongodbAdapter(db),

    // Better Auth server configuration
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,

    // Allowed frontend origins
    trustedOrigins,

    // IP address detection
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['x-forwarded-for'],
      },
    },

    // Email and password authentication
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },

    // Google authentication
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    },

    // JWT plugin
    plugins: [jwt()],
  });
}