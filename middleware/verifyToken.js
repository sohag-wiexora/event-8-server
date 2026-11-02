
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:5000/api/auth/jwks')
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

    const token = authHeader.split(' ')[1];

    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['EdDSA'],
      issuer: 'http://localhost:5000',
      audience: 'http://localhost:5000',
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
