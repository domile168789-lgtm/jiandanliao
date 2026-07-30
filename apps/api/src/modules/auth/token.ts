import jwt from 'jsonwebtoken';

export const signAccessToken = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });

export const signRefreshToken = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '30d' });

export const verifyAccessToken = (token: string) => jwt.verify(token, process.env.JWT_SECRET!) as any;
