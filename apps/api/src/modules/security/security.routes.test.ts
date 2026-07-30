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
import { securityRoutes } from './security.routes';

describe('securityRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
  });

  it('rejects missing auth for all security endpoints', async () => {
    const app = Fastify();
    await app.register(securityRoutes, { prefix: '/api' });

    const requests = [
      { method: 'GET', url: '/api/security/devices' },
      { method: 'GET', url: '/api/security/blacklist' },
      { method: 'GET', url: '/api/security/privacy' },
      { method: 'POST', url: '/api/security/privacy', payload: { discoverableByPhone: false } },
      { method: 'POST', url: '/api/security/scan/resolve', payload: { fileName: 'friend.png' } }
    ] as const;

    for (const request of requests) {
      const res = await app.inject(request);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ code: 'UNAUTHORIZED' });
    }

    await app.close();
  });

  it('loads devices, blacklist, privacy and resolves scan result', async () => {
    executeMock.mockImplementation(async (sql: string) => {
      if (sql.includes('JOIN user_devices')) {
        return [
          [
            {
              deviceId: 'web-preview-device',
              platform: 'h5',
              updatedAt: '2026-07-30 10:00:00'
            },
            {
              deviceId: 'ios-1',
              platform: 'ios',
              updatedAt: '2026-07-29 20:00:00'
            }
          ]
        ];
      }

      return [[]];
    });

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001', deviceId: 'web-preview-device' };
    });
    await app.register(securityRoutes, { prefix: '/api' });

    const devicesRes = await app.inject({ method: 'GET', url: '/api/security/devices' });
    expect(devicesRes.statusCode).toBe(200);
    expect(devicesRes.json()).toEqual([
      {
        deviceId: 'web-preview-device',
        platform: 'H5',
        lastActiveAt: '2026-07-30T10:00:00.000Z',
        isCurrent: true,
        status: '当前设备'
      },
      {
        deviceId: 'ios-1',
        platform: 'IOS',
        lastActiveAt: '2026-07-29T20:00:00.000Z',
        isCurrent: false,
        status: '已登录'
      }
    ]);

    const blacklistRes = await app.inject({ method: 'GET', url: '/api/security/blacklist' });
    expect(blacklistRes.statusCode).toBe(200);
    expect(blacklistRes.json()).toEqual([
      {
        phone: '855010188003',
        name: '风控专员 May',
        blockedAt: '2026-07-30T08:00:00.000Z',
        reason: '已关闭临时通知同步'
      }
    ]);

    const privacyRes = await app.inject({
      method: 'POST',
      url: '/api/security/privacy',
      payload: { discoverableByPhone: false, showReadReceipts: true }
    });
    expect(privacyRes.statusCode).toBe(200);
    expect(privacyRes.json()).toEqual({
      discoverableByPhone: false,
      requireFriendRequestNote: true,
      allowGroupInvite: true,
      showReadReceipts: true
    });

    const scanRes = await app.inject({
      method: 'POST',
      url: '/api/security/scan/resolve',
      payload: { fileName: 'friend-demo.png', textContent: 'friend:855010188001' }
    });
    expect(scanRes.statusCode).toBe(200);
    expect(scanRes.json()).toMatchObject({
      title: '识别到好友二维码',
      to: '/h5/contacts/friends',
      actionLabel: '去添加朋友'
    });

    await app.close();
  });
});
