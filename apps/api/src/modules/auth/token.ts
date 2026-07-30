import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'jiandanliao-preview-jwt-secret-2026';

export const signAccessToken = (payload: object) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: '15m' });

export const signRefreshToken = (payload: object) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });

export const verifyAccessToken = (token: string) => jwt.verify(token, getJwtSecret()) as any;
