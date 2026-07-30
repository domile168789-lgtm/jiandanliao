import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertConversationMemberMock,
  executeMock,
  publishMock,
  resolveUserAccessByPhoneMock,
  MockUserAccessError
} = vi.hoisted(() => ({
  assertConversationMemberMock: vi.fn(),
  executeMock: vi.fn(),
  publishMock: vi.fn(),
  resolveUserAccessByPhoneMock: vi.fn(),
  MockUserAccessError: class MockUserAccessError extends Error {}
}));

vi.mock('../conversations/conversation.service', () => ({
  ConversationService: vi.fn().mockImplementation(() => ({
    assertConversationMember: assertConversationMemberMock
  }))
}));

vi.mock('../../shared/user-access.service', () => ({
  resolveUserAccessByPhone: resolveUserAccessByPhoneMock,
  UserAccessError: MockUserAccessError
}));

vi.mock('../../db', () => ({
  getDb: () => ({
    execute: executeMock
  })
}));

vi.mock('../../redis', () => ({
  getRedis: vi.fn().mockResolvedValue({
    publish: publishMock
  })
}));

import Fastify from 'fastify';
import { receiptRoutes } from './receipt.routes';

describe('receiptRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
    delete process.env.REDIS_URL;
    assertConversationMemberMock.mockResolvedValue(undefined);
    resolveUserAccessByPhoneMock.mockResolvedValue({ userId: 'u1', status: 'ACTIVE' });
  });

  it('rejects unauthenticated receipt create', async () => {
    const app = Fastify();
    await app.register(receiptRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages/m1/receipt',
      payload: { type: 'READ' }
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid receipt type', async () => {
    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(receiptRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages/m1/receipt',
      payload: { type: 'OPENED' }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ code: 'BAD_REQUEST' });
  });

  it('rejects receipt write outside conversation membership', async () => {
    executeMock.mockResolvedValueOnce([[{ conversationId: 'c1' }]]);
    assertConversationMemberMock.mockRejectedValueOnce(new Error('forbidden conversation access'));

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(receiptRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages/m1/receipt',
      payload: { type: 'READ' }
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ code: 'FORBIDDEN' });
  });

  it('returns existing receipt for duplicate acknowledgements', async () => {
    executeMock.mockResolvedValueOnce([[{ conversationId: 'c1' }]]);
    executeMock.mockResolvedValueOnce([[{ id: 'receipt-1', createdAt: '2026-07-30 10:00:00' }]]);

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(receiptRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages/m1/receipt',
      payload: { type: 'DELIVERED' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: 'receipt-1',
      messageId: 'm1',
      userId: 'u1',
      type: 'DELIVERED',
      status: 'already acknowledged',
      createdAt: '2026-07-30 10:00:00'
    });
  });

  it('publishes delivered event for new delivered receipt', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    executeMock.mockResolvedValueOnce([[{ conversationId: 'c1' }]]);
    executeMock.mockResolvedValueOnce([[]]);
    executeMock.mockResolvedValueOnce([{}]);

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(receiptRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages/m1/receipt',
      payload: { type: 'DELIVERED' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: expect.any(String),
      messageId: 'm1',
      userId: 'u1',
      type: 'DELIVERED',
      status: 'acknowledged',
      createdAt: expect.any(String)
    });
    expect(publishMock).toHaveBeenNthCalledWith(
      1,
      'jianliao:server:event',
      expect.stringContaining('"type":"message_delivered"')
    );
    expect(publishMock).toHaveBeenNthCalledWith(
      2,
      'jianliao:receipt:new',
      expect.stringContaining('"type":"DELIVERED"')
    );
  });

  it('rejects banned users from writing receipts', async () => {
    resolveUserAccessByPhoneMock.mockRejectedValueOnce(new MockUserAccessError('user banned'));

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(receiptRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages/m1/receipt',
      payload: { type: 'READ' }
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ code: 'FORBIDDEN' });
  });
});
