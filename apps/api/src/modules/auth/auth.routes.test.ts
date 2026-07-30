import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn()
}));

vi.mock('../../db', () => ({
  getDb: () => ({
    execute: executeMock
  })
}));

import Fastify from 'fastify';
import { hashPassword } from './password';
import { authRoutes } from './auth.routes';
import { resetRateLimits } from '../../shared/rate-limit';

describe('authRoutes risk control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
  });

  it('rejects banned user login', async () => {
    executeMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT u.id AS userId')) {
        return [[{ userId: 'u1', status: 'BANNED', passwordHash: hashPassword('secret123') }]];
      }
      return [{}];
    });

    const app = Fastify();
    await app.register(authRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login/password',
      payload: {
        phone: '85510000001',
        password: 'secret123',
        deviceId: 'ios-1'
      }
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ code: 'FORBIDDEN' });
  });

  it('rate limits repeated password login attempts', async () => {
    executeMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT u.id AS userId')) {
        return [[{ userId: 'u1', status: 'ACTIVE', passwordHash: hashPassword('secret123') }]];
      }
      return [{}];
    });

    const app = Fastify();
    await app.register(authRoutes, { prefix: '/api' });

    for (let i = 0; i < 5; i += 1) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login/password',
        payload: {
          phone: '85510000001',
          password: 'secret123',
          deviceId: `ios-${i}`
        }
      });
      expect(res.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/auth/login/password',
      payload: {
        phone: '85510000001',
        password: 'secret123',
        deviceId: 'ios-blocked'
      }
    });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ code: 'TOO_MANY_REQUESTS' });
  });
});

