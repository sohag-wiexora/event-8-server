
import { createRemoteJWKSet, jwtVerify } from 'jose';

const AUTH_URL = process.env.BETTER_AUTH_URL;

if (!AUTH_URL) {
  throw new Error('BETTER_AUTH_URL is not configured.');
}

const AUTH_BASE_URL = AUTH_URL.replace(/\/$/, '');

const JWKS = createRemoteJWKSet(
  new URL(`${AUTH_BASE_URL}/api/auth/jwks`)
);

export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.slice(7);

    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['EdDSA'],
      issuer: AUTH_BASE_URL,
      audience: AUTH_BASE_URL,
    });

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: User ID is missing.',
      });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    console.error('JWT Verification Failed:', error.message);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
}
