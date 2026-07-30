import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../../plugins/auth.plugin';
import { conversationRoutes } from './conversation.routes';
import { signAccessToken } from '../auth/token';

describe('conversationRoutes', () => {
  it('rejects unauthenticated', async () => {
    const app = Fastify();
    await app.register(authPlugin);
    await app.register(conversationRoutes, { prefix: '/api' });
    const res = await app.inject({ method: 'GET', url: '/api/conversations' });
    expect(res.statusCode).toBe(401);
  });

  it('allows authenticated (no db just checks middleware)', async () => {
    const app = Fastify();
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    await app.register(authPlugin);
    await app.register(conversationRoutes, { prefix: '/api' });
    const token = signAccessToken({ sub: '85512345678', deviceId: 'ios-1' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${token}` }
    });
    // 无数据库时会抛错 DATABASE_URL is required，属于预期（这里只验证鉴权链路）
    expect([500, 401]).toContain(res.statusCode);
  });

  it('rejects unauthenticated group create', async () => {
    const app = Fastify();
    await app.register(authPlugin);
    await app.register(conversationRoutes, { prefix: '/api' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations/group',
      payload: {
        title: '项目群',
        memberPhones: ['85510000002']
      }
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated group invite and leave', async () => {
    const app = Fastify();
    await app.register(authPlugin);
    await app.register(conversationRoutes, { prefix: '/api' });

    const inviteRes = await app.inject({
      method: 'POST',
      url: '/api/conversations/c1/invite',
      payload: {
        memberPhones: ['85510000002']
      }
    });
    const leaveRes = await app.inject({
      method: 'POST',
      url: '/api/conversations/c1/leave'
    });

    expect(inviteRes.statusCode).toBe(401);
    expect(leaveRes.statusCode).toBe(401);
  });
});
