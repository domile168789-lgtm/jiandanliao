import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../../plugins/auth.plugin';
import { contactsRoutes } from './contacts.routes';
import { signAccessToken } from '../auth/token';
import { previewStore } from '../im-preview/preview-store';

async function buildApp() {
  const app = Fastify();
  await authPlugin(app);
  await app.register(contactsRoutes, { prefix: '/api' });
  return app;
}

describe('contactsRoutes', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    previewStore.reset();
  });

  it('rejects unauthenticated access', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/contacts/friend-requests' });
    expect(res.statusCode).toBe(401);
  });

  it('lists preview friend requests for the current user', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/contacts/friend-requests',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '阿杰商务', status: '待通过' }),
        expect.objectContaining({ name: '风控专员 May', status: '已添加' })
      ])
    );
  });

  it('accepts a friend request in preview mode', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const acceptRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/friend-requests/friend-1/accept',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(acceptRes.statusCode).toBe(200);
    expect(acceptRes.json()).toMatchObject({
      id: 'friend-1',
      status: '已添加'
    });

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/friend-requests',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'friend-1', status: '已添加' })])
    );
  });

  it('lists and creates tags in preview mode', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/tags',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: '渠道合作' })])
    );

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/tags',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: '重点跟进' }
    });

    expect(createRes.statusCode).toBe(200);
    expect(createRes.json()).toMatchObject({
      title: '重点跟进',
      count: 0
    });
  });

  it('searches contacts and services in preview mode', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/search?keyword=钱包',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: '钱包', type: '服务' })])
    );
  });
});
