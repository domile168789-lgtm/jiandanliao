import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../../plugins/auth.plugin';
import { conversationRoutes } from './conversation.routes';
import { signAccessToken } from '../auth/token';
import { previewStore } from '../im-preview/preview-store';

async function buildApp() {
  const app = Fastify();
  await authPlugin(app);
  await app.register(conversationRoutes, { prefix: '/api' });
  return app;
}

function registerPreviewUser(phone: string) {
  previewStore.register({
    phone,
    password: 'demo123456',
    deviceId: `ios-${phone}`,
    nickname: `用户${phone.slice(-4)}`
  });

  return {
    phone,
    accessToken: signAccessToken({ sub: phone, deviceId: `ios-${phone}` })
  };
}

describe('conversationRoutes', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = '12345678901234567890123456789012';
  });

  it('rejects unauthenticated', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/conversations' });
    expect(res.statusCode).toBe(401);
  });

  it('allows authenticated preview conversation listing', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '85512345678', deviceId: 'ios-1' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('rejects unauthenticated group create', async () => {
    const app = await buildApp();
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

  it('creates a group conversation in preview mode and returns it in list', async () => {
    const app = await buildApp();
    const auth = registerPreviewUser('855010100010');
    const peerOne = registerPreviewUser('855010100011');
    const peerTwo = registerPreviewUser('855010100012');

    const response = await app.inject({
      method: 'POST',
      url: '/api/conversations/group',
      headers: {
        authorization: `Bearer ${auth.accessToken}`
      },
      payload: {
        title: '项目群',
        memberPhones: [peerOne.phone, peerTwo.phone]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      type: 'GROUP',
      title: '项目群'
    });

    const conversationsResponse = await app.inject({
      method: 'GET',
      url: '/api/conversations',
      headers: {
        authorization: `Bearer ${auth.accessToken}`
      }
    });

    expect(conversationsResponse.statusCode).toBe(200);
    expect(conversationsResponse.json()[0]).toMatchObject({
      id: response.json().id,
      type: 'GROUP',
      title: '项目群'
    });
  });

  it('rejects group creation with fewer than two peers', async () => {
    const app = await buildApp();
    const auth = registerPreviewUser('855010100020');
    const peerOne = registerPreviewUser('855010100021');

    const response = await app.inject({
      method: 'POST',
      url: '/api/conversations/group',
      headers: {
        authorization: `Bearer ${auth.accessToken}`
      },
      payload: {
        title: '人数不足',
        memberPhones: [peerOne.phone]
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: 'BAD_REQUEST',
      message: 'memberPhones must contain at least 2 items'
    });
  });

  it('rejects unauthenticated group invite and leave', async () => {
    const app = await buildApp();

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
