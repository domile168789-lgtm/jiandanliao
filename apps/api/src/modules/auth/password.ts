import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const hashPassword = (password: string) => {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt') return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
};

