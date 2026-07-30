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
import { profileRoutes } from './profile.routes';

describe('profileRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
  });

  it('rejects missing auth for all profile endpoints', async () => {
    const app = Fastify();
    await app.register(profileRoutes, { prefix: '/api' });

    const endpoints = [
      '/api/profile/summary',
      '/api/profile/wallet',
      '/api/profile/earnings',
      '/api/profile/agent',
      '/api/profile/system-notices'
    ];

    for (const url of endpoints) {
      const res = await app.inject({
        method: 'GET',
        url
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ code: 'UNAUTHORIZED' });
    }

    await app.close();
  });

  it('updates profile nickname for authenticated user', async () => {
    executeMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('UPDATE users SET nickname')) {
        expect(params).toEqual(['新的昵称', expect.any(Date), '85510000001']);
        return [[]];
      }

      if (sql.includes('FROM users')) {
        return [
          [
            {
              id: 'u1',
              phone: '85510000001',
              nickname: '新的昵称',
              status: 'ACTIVE',
              createdAt: '2026-07-01 08:00:00'
            }
          ]
        ];
      }

      return [[]];
    });

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001', deviceId: 'ios-1' };
    });
    await app.register(profileRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/profile',
      payload: { displayName: '新的昵称' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      displayName: '新的昵称',
      phone: '85510000001',
      memberSince: '2026-07-01'
    });

    await app.close();
  });

  it('returns lightweight readonly profile payloads for authenticated user', async () => {
    executeMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM users')) {
        return [
          [
            {
              id: 'u1',
              phone: '85510000001',
              nickname: '演示账号',
              status: 'ACTIVE',
              createdAt: '2026-07-01 08:00:00'
            }
          ]
        ];
      }

      if (sql.includes('FROM activity_campaigns')) {
        return [
          [
            {
              id: 'act-1',
              title: '邀请奖励计划',
              content: '邀请有效用户加入后可累计本周收益。',
              createdAt: '2026-07-29 10:00:00'
            }
          ]
        ];
      }

      return [[]];
    });

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001', deviceId: 'ios-1' };
    });
    await app.register(profileRoutes, { prefix: '/api' });

    const summaryRes = await app.inject({ method: 'GET', url: '/api/profile/summary' });
    expect(summaryRes.statusCode).toBe(200);
    expect(summaryRes.json()).toEqual({
      displayName: '演示账号',
      phone: '85510000001',
      memberSince: '2026-07-01',
      safetyLevel: '标准保护',
      avatarUrl: expect.any(String)
    });

    const walletRes = await app.inject({ method: 'GET', url: '/api/profile/wallet' });
    expect(walletRes.statusCode).toBe(200);
    expect(walletRes.json()).toEqual({
      balance: expect.any(Number),
      pendingIncome: expect.any(Number),
      currency: 'USD',
      updatedAt: expect.any(String)
    });

    const earningsRes = await app.inject({ method: 'GET', url: '/api/profile/earnings' });
    expect(earningsRes.statusCode).toBe(200);
    expect(earningsRes.json()).toEqual({
      today: expect.any(Number),
      thisWeek: expect.any(Number),
      thisMonth: expect.any(Number)
    });

    const agentRes = await app.inject({ method: 'GET', url: '/api/profile/agent' });
    expect(agentRes.statusCode).toBe(200);
    expect(agentRes.json()).toEqual({
      level: expect.any(String),
      teamCount: expect.any(Number),
      commissionRate: expect.any(String),
      status: '已激活'
    });

    const noticesRes = await app.inject({ method: 'GET', url: '/api/profile/system-notices' });
    expect(noticesRes.statusCode).toBe(200);
    expect(noticesRes.json()).toEqual([
      {
        id: 'account-u1',
        title: '欢迎使用柬单聊',
        summary: '你的账号资料、钱包和收益入口已完成后端接入，可在我的页直接查看。',
        createdAt: '2026-07-01T08:00:00.000Z',
        status: '已读'
      },
      {
        id: 'activity-act-1',
        title: '邀请奖励计划',
        summary: '邀请有效用户加入后可累计本周收益。',
        createdAt: '2026-07-29T10:00:00.000Z',
        status: '未读'
      }
    ]);

    expect(executeMock).toHaveBeenCalled();
    await app.close();
  });
});
