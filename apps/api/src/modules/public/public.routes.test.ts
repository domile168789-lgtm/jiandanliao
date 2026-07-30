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
import { publicRoutes } from './public.routes';

describe('publicRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
  });

  it('returns branding config for requested group', async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          platformGroup: 'mobile',
          projectName: '柬聊',
          logoUrl: '/logo.png',
          themeAssetUrl: '/theme.png',
          updatedBy: 'admin-super-1',
          updatedAt: '2026-07-30 00:00:00'
        }
      ]
    ]);

    const app = Fastify();
    await app.register(publicRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/public/branding?group=mobile'
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      platformGroup: 'mobile',
      projectName: '柬聊',
      logoUrl: '/logo.png',
      themeAssetUrl: '/theme.png',
      updatedBy: 'admin-super-1',
      updatedAt: '2026-07-30 00:00:00'
    });
  });

  it('rejects invalid branding group query', async () => {
    const app = Fastify();
    await app.register(publicRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/public/branding?group=tablet'
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when branding config does not exist', async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const app = Fastify();
    await app.register(publicRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/public/branding?group=pc'
    });

    expect(res.statusCode).toBe(404);
  });
});
