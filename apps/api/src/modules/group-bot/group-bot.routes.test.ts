import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assertConversationMemberMock, createPurchaseMock, createMentionAlertMock, requestRefundMock } =
  vi.hoisted(() => ({
    assertConversationMemberMock: vi.fn(),
    createPurchaseMock: vi.fn(),
    createMentionAlertMock: vi.fn(),
    requestRefundMock: vi.fn()
  }));

vi.mock('../conversations/conversation.service', () => ({
  ConversationService: vi.fn().mockImplementation(() => ({
    assertConversationMember: assertConversationMemberMock
  }))
}));

vi.mock('./group-bot.service', () => ({
  GroupBotService: vi.fn().mockImplementation(() => ({
    createPurchase: createPurchaseMock,
    requestRefund: requestRefundMock,
    createMentionAlert: createMentionAlertMock
  }))
}));

import Fastify from 'fastify';
import { groupBotRoutes } from './group-bot.routes';

describe('groupBotRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates purchase bot event for authenticated conversation member', async () => {
    assertConversationMemberMock.mockResolvedValueOnce(undefined);
    createPurchaseMock.mockResolvedValueOnce({ id: 'o1', status: 'PAID' });

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(groupBotRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/group-bot/purchase',
      payload: {
        conversationId: 'c1',
        productName: '群广告包',
        amount: 299
      }
    });

    expect(res.statusCode).toBe(200);
    expect(createPurchaseMock).toHaveBeenCalledWith({
      conversationId: 'c1',
      buyerPhone: '85510000001',
      productName: '群广告包',
      amount: 299
    });
  });

  it('creates mention alert for admin keywords', async () => {
    assertConversationMemberMock.mockResolvedValueOnce(undefined);
    createMentionAlertMock.mockResolvedValueOnce({ id: 'a1', triggerType: 'MENTION' });

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(groupBotRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/group-bot/mention-alert',
      payload: {
        conversationId: 'c1',
        keyword: '财务',
        text: '财务请处理一下退款'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(createMentionAlertMock).toHaveBeenCalledWith({
      conversationId: 'c1',
      senderPhone: '85510000001',
      keyword: '财务',
      text: '财务请处理一下退款'
    });
  });

  it('requests refund for authenticated user', async () => {
    requestRefundMock.mockResolvedValueOnce({ id: 'o1', refundStatus: 'REQUESTED' });

    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85510000001' };
    });
    await app.register(groupBotRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/group-bot/refund',
      payload: {
        orderId: 'o1',
        reason: '重复购买'
      }
    });

    expect(res.statusCode).toBe(200);
    expect(requestRefundMock).toHaveBeenCalledWith({
      orderId: 'o1',
      requesterPhone: '85510000001',
      reason: '重复购买'
    });
  });
});
