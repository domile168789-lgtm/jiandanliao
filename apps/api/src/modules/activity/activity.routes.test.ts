import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createMock, listMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  listMock: vi.fn()
}));

vi.mock('./activity.service', () => ({
  ActivityService: vi.fn().mockImplementation(() => ({
    list: listMock,
    create: createMock
  }))
}));

import Fastify from 'fastify';
import { adminRoutes } from '../admin/admin.routes';

describe('activity admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
  });

  it('lists activity campaigns for admin', async () => {
    listMock.mockResolvedValueOnce([
      {
        id: 'ac1',
        activityType: 'DISCOUNT',
        title: '周末优惠'
      }
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/activity-campaigns',
      headers: {
        'x-admin-role': 'AUDITOR',
        'x-admin-id': '10003'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: 'ac1',
        activityType: 'DISCOUNT',
        title: '周末优惠'
      }
    ]);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it('creates activity campaign for admin', async () => {
    createMock.mockResolvedValueOnce({
      id: 'ac1',
      activityType: 'DISCOUNT',
      title: '周末优惠',
      content: '满 100 减 10',
      status: 'DRAFT',
      createdBy: '10001'
    });

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/activity-campaigns',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': '10001'
      },
      payload: {
        activityType: 'DISCOUNT',
        title: '  周末优惠  ',
        content: ' 满 100 减 10 ',
        coverUrl: '/cover.png',
        status: 'DRAFT',
        startAt: '2026-08-01T00:00:00.000Z',
        endAt: '2026-08-07T23:59:59.000Z',
        config: {
          discountRate: 0.1
        }
      }
    });

    expect(res.statusCode).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      {
        activityType: 'DISCOUNT',
        title: '周末优惠',
        content: '满 100 减 10',
        coverUrl: '/cover.png',
        status: 'DRAFT',
        startAt: '2026-08-01T00:00:00.000Z',
        endAt: '2026-08-07T23:59:59.000Z',
        config: {
          discountRate: 0.1
        }
      },
      '10001'
    );
  });

  it('rejects invalid activity payload', async () => {
    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/activity-campaigns',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': '10001'
      },
      payload: {
        activityType: 'UNKNOWN',
        title: ' ',
        content: '活动内容'
      }
    });

    expect(res.statusCode).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });
});
