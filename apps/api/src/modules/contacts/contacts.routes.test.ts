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

  it('lists preview contacts and loads contact profile', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const contactsRes = await app.inject({
      method: 'GET',
      url: '/api/contacts',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(contactsRes.statusCode).toBe(200);
    expect(contactsRes.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '商务对接',
          phone: '855010100002'
        })
      ])
    );

    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/profile/855010188003',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.json()).toMatchObject({
      name: '风控专员 May',
      relationship: 'FRIEND',
      canSendMessage: true
    });
  });

  it('sends a friend request and exposes pending profile state', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/friend-requests',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        targetPhone: '855010100003',
        note: '一起跟进渠道活动。'
      }
    });

    expect(sendRes.statusCode).toBe(200);
    expect(sendRes.json()).toMatchObject({
      phone: '855010100003',
      status: '待通过'
    });

    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/profile/855010100003',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.json()).toMatchObject({
      phone: '855010100003',
      relationship: 'PENDING_OUTGOING',
      canSendRequest: false
    });
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

  it('deletes, blocks and reports a contact in preview mode', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const deleteRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/profile/855010188003/delete',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json()).toEqual({ ok: true, status: 'REMOVED' });

    const blockRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/profile/855010100002/block',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(blockRes.statusCode).toBe(200);
    expect(blockRes.json()).toEqual({ ok: true, status: 'BLOCKED' });

    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/profile/855010100002',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.json()).toMatchObject({
      phone: '855010100002',
      relationship: 'BLOCKED'
    });

    const reportRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/profile/855010100004/report',
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: '疑似异常触达' }
    });
    expect(reportRes.statusCode).toBe(200);
    expect(reportRes.json()).toEqual({
      id: expect.any(String),
      status: 'OPEN'
    });
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

  it('manages tag members in preview mode', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/tags/tag-1/members',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '商务对接', phone: '855010100002' })])
    );

    const addRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/tags/tag-1/members',
      headers: { authorization: `Bearer ${token}` },
      payload: { contactPhone: '855010188001' }
    });
    expect(addRes.statusCode).toBe(200);
    expect(addRes.json()).toEqual({ ok: true });

    const removeRes = await app.inject({
      method: 'POST',
      url: '/api/contacts/tags/tag-1/members/remove',
      headers: { authorization: `Bearer ${token}` },
      payload: { contactPhone: '855010100002' }
    });
    expect(removeRes.statusCode).toBe(200);
    expect(removeRes.json()).toEqual({ ok: true });

    const tagsRes = await app.inject({
      method: 'GET',
      url: '/api/contacts/tags',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(tagsRes.statusCode).toBe(200);
    expect(tagsRes.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tag-1',
          members: expect.arrayContaining([
            expect.objectContaining({ phone: '855010188001' })
          ])
        })
      ])
    );
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

  it('searches contact profile routes in preview mode', async () => {
    const app = await buildApp();
    const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/search?keyword=商务',
      headers: { authorization: `Bearer ${token}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: '商务对接',
          to: '/h5/contacts/profile/855010100002'
        })
      ])
    );
  });
});
