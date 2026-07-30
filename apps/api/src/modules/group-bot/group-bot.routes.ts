import { FastifyInstance } from 'fastify';
import { ConversationService } from '../conversations/conversation.service.js';
import { GroupBotService } from './group-bot.service.js';

const isForbiddenConversationAccess = (error: unknown) =>
  error instanceof Error && error.message === 'forbidden conversation access';

export async function groupBotRoutes(app: FastifyInstance) {
  const conversationService = new ConversationService();
  const service = new GroupBotService();

  app.post('/group-bot/purchase', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as {
      conversationId?: string;
      productName?: string;
      amount?: number;
    };

    if (!body?.conversationId || !body?.productName || !Number(body.amount)) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    try {
      await conversationService.assertConversationMember(body.conversationId, request.user.phone);
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      throw error;
    }

    return service.createPurchase({
      conversationId: body.conversationId,
      buyerPhone: request.user.phone,
      productName: body.productName,
      amount: Number(body.amount)
    });
  });

  app.post('/group-bot/refund', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as { orderId?: string; reason?: string };
    if (!body?.orderId || !body?.reason?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }
    try {
      return await service.requestRefund({
        orderId: body.orderId,
        requesterPhone: request.user.phone,
        reason: body.reason.trim()
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'order not found') {
        return reply.code(404).send({ code: 'NOT_FOUND' });
      }
      throw error;
    }
  });

  app.post('/group-bot/mention-alert', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as { conversationId?: string; keyword?: string; text?: string };
    if (!body?.conversationId || !body?.keyword?.trim() || !body?.text?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    try {
      await conversationService.assertConversationMember(body.conversationId, request.user.phone);
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      throw error;
    }

    return service.createMentionAlert({
      conversationId: body.conversationId,
      senderPhone: request.user.phone,
      keyword: body.keyword.trim(),
      text: body.text.trim()
    });
  });
}
