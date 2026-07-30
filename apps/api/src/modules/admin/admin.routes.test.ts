import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdTaskMock, executeMock, listAdTasksMock, listAlertsMock, listOrdersMock } = vi.hoisted(() => ({
  createAdTaskMock: vi.fn(),
  executeMock: vi.fn(),
  listAdTasksMock: vi.fn(),
  listAlertsMock: vi.fn(),
  listOrdersMock: vi.fn()
}));

vi.mock('../../db', () => ({
  getDb: () => ({
    execute: executeMock
  })
}));

vi.mock('../group-bot/group-bot.service', () => ({
  GroupBotService: vi.fn().mockImplementation(() => ({
    listOrders: listOrdersMock,
    listAlerts: listAlertsMock,
    listAdTasks: listAdTasksMock,
    createAdTask: createAdTaskMock
  }))
}));

import Fastify from 'fastify';
import { adminRoutes } from './admin.routes';

describe('adminRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
    process.env.JWT_SECRET = '12345678901234567890123456789012';
  });

  it('rejects unauthenticated admin request', async () => {
    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users/u1/ban'
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects forbidden admin role on ban', async () => {
    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users/u1/ban',
      headers: {
        'x-admin-role': 'AUDITOR',
        'x-admin-id': 'admin-auditor-1'
      }
    });

    expect(res.statusCode).toBe(403);
  });

  it('lists users for authorized admin', async () => {
    executeMock.mockResolvedValueOnce([
      [{ id: 'u1', phone: '85510000001', nickname: '演示用户1', status: 'ACTIVE', updatedAt: '2026-07-29 00:00:00' }]
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': 'admin-super-1'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: 'u1',
        phone: '85510000001',
        nickname: '演示用户1',
        status: 'ACTIVE',
        updatedAt: '2026-07-29 00:00:00'
      }
    ]);
  });

  it('supports real admin login and bearer token access', async () => {
    executeMock.mockResolvedValueOnce([
      [{ id: 'u1', phone: '85510000001', nickname: '演示用户1', status: 'ACTIVE', updatedAt: '2026-07-29 00:00:00' }]
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: {
        username: 'superadmin',
        password: 'change-me-superadmin'
      }
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.json()).toEqual({
      accessToken: expect.any(String),
      admin: {
        id: '10001',
        role: 'SUPER_ADMIN',
        username: 'superadmin'
      }
    });

    const usersRes = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: {
        authorization: `Bearer ${loginRes.json().accessToken}`
      }
    });

    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.json()).toEqual([
      {
        id: 'u1',
        phone: '85510000001',
        nickname: '演示用户1',
        status: 'ACTIVE',
        updatedAt: '2026-07-29 00:00:00'
      }
    ]);
  });

  it('lists branding configs for authorized admin', async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          platformGroup: 'mobile',
          projectName: '柬聊',
          logoUrl: '/mobile-logo.png',
          themeAssetUrl: '/mobile-theme.png',
          updatedBy: 'admin-super-1',
          updatedAt: '2026-07-30 00:00:00'
        }
      ]
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/branding',
      headers: {
        'x-admin-role': 'AUDITOR',
        'x-admin-id': 'admin-auditor-1'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        platformGroup: 'mobile',
        projectName: '柬聊',
        logoUrl: '/mobile-logo.png',
        themeAssetUrl: '/mobile-theme.png',
        updatedBy: 'admin-super-1',
        updatedAt: '2026-07-30 00:00:00'
      }
    ]);
  });

  it('updates branding config for authorized admin', async () => {
    executeMock.mockResolvedValueOnce([{}]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/branding/mobile',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': '10001'
      },
      payload: {
        projectName: '柬聊移动端',
        logoUrl: '/mobile-logo.png',
        themeAssetUrl: '/mobile-theme.png'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      platformGroup: 'mobile',
      projectName: '柬聊移动端',
      logoUrl: '/mobile-logo.png',
      themeAssetUrl: '/mobile-theme.png',
      updatedBy: '10001',
      updatedAt: expect.any(String)
    });
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO branding_configs'),
      [
        expect.any(String),
        'mobile',
        '柬聊移动端',
        '/mobile-logo.png',
        '/mobile-theme.png',
        null,
        '10001',
        expect.any(Date)
      ]
    );
  });

  it('rejects invalid branding payload', async () => {
    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/admin/branding/mobile',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': '10001'
      },
      payload: {
        projectName: ' '
      }
    });

    expect(res.statusCode).toBe(400);
  });

  it('bans user and writes audit log', async () => {
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([{}]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/users/u1/ban',
      headers: {
        'x-admin-role': 'OPERATOR',
        'x-admin-id': '10002'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'u1', status: 'BANNED', audited: true });
    expect(executeMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE users"),
      ['u1']
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO admin_actions"),
      [
        expect.any(String),
        '10002',
        'BAN_USER',
        'USER',
        'u1'
      ]
    );
  });

  it('lists reports for authorized admin', async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          id: 'r1',
          reporterUserId: 'u1',
          targetType: 'USER',
          targetId: 'u2',
          reason: 'spam',
          status: 'OPEN',
          createdAt: '2026-07-29 00:00:00'
        }
      ]
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: {
        'x-admin-role': 'AUDITOR',
        'x-admin-id': '10003'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: 'r1',
        reporterUserId: 'u1',
        targetType: 'USER',
        targetId: 'u2',
        reason: 'spam',
        status: 'OPEN',
        createdAt: '2026-07-29 00:00:00'
      }
    ]);
  });

  it('resolves report and writes audit log', async () => {
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([{}]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/reports/r1/resolve',
      headers: {
        'x-admin-role': 'OPERATOR',
        'x-admin-id': '10002'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'r1', status: 'CLOSED', audited: true });
    expect(executeMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE reports'),
      ['r1']
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO admin_actions'),
      [expect.any(String), '10002', 'RESOLVE_REPORT', 'REPORT', 'r1']
    );
  });

  it('creates announcement and writes audit log', async () => {
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([[{ id: 'u1' }]]);
    executeMock.mockResolvedValueOnce([[]]);
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([{}]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/announcements',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': '10001'
      },
      payload: {
        title: '系统维护',
        content: '今晚 10 点开始维护'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: expect.any(String),
      status: 'PUBLISHED',
      audited: true
    });
    expect(executeMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO announcements"),
      [
        expect.any(String),
        '系统维护',
        '今晚 10 点开始维护',
        '10001'
      ]
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO admin_actions"),
      [
        expect.any(String),
        '10001',
        'CREATE_ANNOUNCEMENT',
        'ANNOUNCEMENT',
        expect.any(String)
      ]
    );
  });

  it('lists announcements for authorized admin', async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          id: 'notice-1',
          title: '系统维护',
          content: '今晚 10 点开始维护',
          status: 'PUBLISHED',
          createdBy: '10001',
          createdAt: '2026-07-30 10:00:00'
        }
      ]
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/announcements',
      headers: {
        'x-admin-role': 'AUDITOR',
        'x-admin-id': '10003'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: 'notice-1',
        title: '系统维护',
        content: '今晚 10 点开始维护',
        status: 'PUBLISHED',
        createdBy: '10001',
        createdAt: '2026-07-30 10:00:00'
      }
    ]);
  });

  it('rejects invalid announcement payload', async () => {
    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/announcements',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': 'admin-super-1'
      },
      payload: {
        title: '系统维护'
      }
    });

    expect(res.statusCode).toBe(400);
  });

  it('lists audit actions for authorized admin', async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          id: 'a1',
          adminId: 'admin-super-1',
          action: 'BAN_USER',
          targetType: 'USER',
          targetId: 'u1',
          createdAt: '2026-07-29 00:00:00'
        }
      ]
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-actions',
      headers: {
        'x-admin-role': 'AUDITOR',
        'x-admin-id': 'admin-auditor-1'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: 'a1',
        adminId: 'admin-super-1',
        action: 'BAN_USER',
        targetType: 'USER',
        targetId: 'u1',
        createdAt: '2026-07-29 00:00:00'
      }
    ]);
  });

  it('lists ad tasks for authorized admin', async () => {
    listAdTasksMock.mockResolvedValueOnce([
      {
        id: 'task-1',
        content: '周末活动广告',
        sendMode: 'NOW',
        status: 'DONE',
        conversationIds: ['c1']
      }
    ]);

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/group-bot/ad-tasks',
      headers: {
        'x-admin-role': 'AUDITOR',
        'x-admin-id': '10003'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: 'task-1',
        content: '周末活动广告',
        sendMode: 'NOW',
        status: 'DONE',
        conversationIds: ['c1']
      }
    ]);
    expect(listAdTasksMock).toHaveBeenCalledTimes(1);
  });

  it('creates ad task for authorized admin', async () => {
    createAdTaskMock.mockResolvedValueOnce({
      id: 'task-1',
      content: '活动广告',
      sendMode: 'NOW',
      status: 'DONE',
      createdBy: '10001',
      conversationIds: ['c1', 'c2'],
      enabledScopes: ['ADS']
    });

    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/group-bot/ad-tasks',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': '10001'
      },
      payload: {
        conversationIds: ['c1', 'c2'],
        content: '  活动广告  ',
        sendMode: 'NOW',
        enabledScopes: ['ADS']
      }
    });

    expect(res.statusCode).toBe(200);
    expect(createAdTaskMock).toHaveBeenCalledWith({
      createdBy: '10001',
      conversationIds: ['c1', 'c2'],
      content: '活动广告',
      sendMode: 'NOW',
      scheduledAt: null,
      enabledScopes: ['ADS']
    });
    expect(res.json()).toEqual({
      id: 'task-1',
      content: '活动广告',
      sendMode: 'NOW',
      status: 'DONE',
      createdBy: '10001',
      conversationIds: ['c1', 'c2'],
      enabledScopes: ['ADS']
    });
  });

  it('rejects invalid ad task payload', async () => {
    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/group-bot/ad-tasks',
      headers: {
        'x-admin-role': 'SUPER_ADMIN',
        'x-admin-id': '10001'
      },
      payload: {
        conversationIds: [],
        content: ' ',
        sendMode: 'CUSTOM',
        scheduledAt: 'invalid-date'
      }
    });

    expect(res.statusCode).toBe(400);
    expect(createAdTaskMock).not.toHaveBeenCalled();
  });
});
