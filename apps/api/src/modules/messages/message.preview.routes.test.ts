import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../../plugins/auth.plugin';
import { previewStore } from '../im-preview/preview-store';
import { conversationRoutes } from '../conversations/conversation.routes';
import { messageRoutes } from './message.routes';
import { signAccessToken } from '../auth/token';

async function buildApp() {
  const app = Fastify();
  await authPlugin(app);
  await app.register(conversationRoutes, { prefix: '/api' });
  await app.register(messageRoutes, { prefix: '/api' });
  return app;
}

describe('messageRoutes preview mode', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    previewStore.reset();
  });

  it('marks a preview conversation as read', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const readRes = await app.inject({
      method: 'POST',
      url: '/api/messages/read',
      headers: { authorization: `Bearer ${token}` },
      payload: { conversationId: 'preview-dm-business' }
    });

    expect(readRes.statusCode).toBe(200);
    expect(readRes.json()).toMatchObject({
      ok: true,
      conversationId: 'preview-dm-business',
      unreadCount: 0
    });

    const conversationsRes = await app.inject({
      method: 'GET',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(conversationsRes.statusCode).toBe(200);
    expect(conversationsRes.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'preview-dm-business',
          unreadCount: 0
        })
      ])
    );

    const listApp = await buildApp();
    const listRes = await listApp.inject({
      method: 'POST',
      url: '/api/messages/read',
      headers: { authorization: `Bearer ${token}` },
      payload: { conversationId: 'preview-dm-business' }
    });

    expect(listRes.json()).toMatchObject({
      status: 'already read',
      unreadCount: 0
    });
  });
});
