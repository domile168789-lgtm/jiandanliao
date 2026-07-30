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
import { reportRoutes } from './report.routes';
import { resetRateLimits } from '../../shared/rate-limit';

describe('reportRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
  });

  it('creates report for active user', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    executeMock.mockResolvedValueOnce([{}]);

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(reportRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        targetType: 'USER',
        targetId: 'u2',
        reason: 'spam'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: expect.any(String),
      status: 'OPEN'
    });
  });

  it('rejects banned user report', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'BANNED' }]]);

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(reportRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        targetType: 'USER',
        targetId: 'u2',
        reason: 'spam'
      }
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ code: 'FORBIDDEN' });
  });
});

