import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assertConversationMemberMock, createMock, markConversationReadMock, executeMock, MockMessageValidationError } =
  vi.hoisted(() => ({
  assertConversationMemberMock: vi.fn(),
  createMock: vi.fn(),
  markConversationReadMock: vi.fn(),
  executeMock: vi.fn(),
  MockMessageValidationError: class MockMessageValidationError extends Error {}
  }));

vi.mock('../conversations/conversation.service', () => ({
  ConversationService: vi.fn().mockImplementation(() => ({
    assertConversationMember: assertConversationMemberMock
  }))
}));

vi.mock('./message.service', () => ({
  MessageService: vi.fn().mockImplementation(() => ({
    create: createMock,
    markConversationRead: markConversationReadMock
  })),
  MessageValidationError: MockMessageValidationError
}));

vi.mock('../../db', () => ({
  getDb: () => ({
    execute: executeMock
  })
}));

import Fastify from 'fastify';
import { messageRoutes } from './message.routes';
import { resetRateLimits } from '../../shared/rate-limit';

describe('messageRoutes authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
    assertConversationMemberMock.mockResolvedValue(undefined);
    createMock.mockResolvedValue({ id: 'm-default', status: 'SENT' });
    markConversationReadMock.mockResolvedValue({
      ok: true,
      conversationId: 'c1',
      unreadCount: 0,
      status: 'acknowledged'
    });
  });

  it('rejects unauthenticated message create', async () => {
    const app = Fastify();
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { conversationId: 'c1', type: 'TEXT', body: { text: 'hi' } }
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated message list', async () => {
    const app = Fastify();
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/messages?conversationId=c1'
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects listing messages outside conversation membership', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    assertConversationMemberMock.mockRejectedValueOnce(new Error('forbidden conversation access'));

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/messages?conversationId=c1'
    });

    expect(res.statusCode).toBe(403);
  });

  it('rejects creating messages outside conversation membership', async () => {
    assertConversationMemberMock.mockRejectedValueOnce(new Error('forbidden conversation access'));

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { conversationId: 'c1', type: 'TEXT', body: { text: 'hi' } }
    });

    expect(res.statusCode).toBe(403);
  });

  it('marks conversations as read for conversation members', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages/read',
      payload: { conversationId: 'c1' }
    });

    expect(res.statusCode).toBe(200);
    expect(markConversationReadMock).toHaveBeenCalledWith({
      phone: '85510000001',
      conversationId: 'c1'
    });
    expect(res.json()).toMatchObject({
      ok: true,
      conversationId: 'c1',
      unreadCount: 0
    });
  });

  it('creates messages for conversation members', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    createMock.mockResolvedValueOnce({ id: 'm1', status: 'SENT' });

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { conversationId: 'c1', type: 'TEXT', body: { text: 'hi' } }
    });

    expect(res.statusCode).toBe(200);
    expect(createMock).toHaveBeenCalledWith({
      conversationId: 'c1',
      type: 'TEXT',
      body: { text: 'hi' },
      senderId: 'u1'
    });
  });

  it('returns consistent bad request payloads for validation errors', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    createMock.mockRejectedValueOnce(new MockMessageValidationError('missing image fields'));

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { conversationId: 'c1', type: 'IMAGE', body: { mimeType: 'image/jpeg' } }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      code: 'BAD_REQUEST',
      message: 'missing image fields'
    });
  });

  it('rejects banned user from creating messages', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'BANNED' }]]);

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(messageRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/messages',
      payload: { conversationId: 'c1', type: 'TEXT', body: { text: 'hi' } }
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ code: 'FORBIDDEN' });
  });
});
