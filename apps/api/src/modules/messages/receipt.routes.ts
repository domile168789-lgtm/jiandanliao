import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { getRedis } from '../../redis.js';
import { ConversationService } from '../conversations/conversation.service.js';
import { resolveUserAccessByPhone, UserAccessError } from '../../shared/user-access.service.js';

const receiptTypes = new Set(['DELIVERED', 'READ']);

const isForbiddenConversationAccess = (error: unknown) =>
  error instanceof Error && error.message === 'forbidden conversation access';

export async function receiptRoutes(app: FastifyInstance) {
  const conversationService = new ConversationService();

  app.post('/messages/:id/receipt', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    if (!process.env.DATABASE_URL) return reply.code(501).send({ code: 'NOT_IMPLEMENTED' });

    const { id: messageId } = request.params as { id: string };
    const body = request.body as { type: 'DELIVERED' | 'READ' };
    const receiptType = typeof body?.type === 'string' ? body.type : '';
    if (!receiptTypes.has(receiptType)) return reply.code(400).send({ code: 'BAD_REQUEST' });

    const db = getDb();
    let userId: string;
    try {
      const access = await resolveUserAccessByPhone(request.user.phone);
      userId = access.userId;
    } catch (error) {
      if (error instanceof UserAccessError && error.message === 'user banned') {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (error instanceof UserAccessError) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      throw error;
    }

    // 找消息所属会话，便于 ws 推送
    const [msgRows] = await db.execute<any[]>(
      `SELECT conversation_id AS conversationId FROM messages WHERE id = ? LIMIT 1`,
      [messageId]
    );
    const conversationId = msgRows?.[0]?.conversationId as string | undefined;
    if (!conversationId) return reply.code(404).send({ code: 'NOT_FOUND' });

    try {
      await conversationService.assertConversationMember(conversationId, request.user.phone);
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      throw error;
    }

    const [receiptRows] = await db.execute<any[]>(
      `SELECT id, created_at AS createdAt
       FROM message_receipts
       WHERE message_id = ? AND user_id = ? AND type = ?
       LIMIT 1`,
      [messageId, userId, receiptType]
    );
    const existingReceipt = receiptRows?.[0] as { id: string; createdAt: Date | string } | undefined;

    if (existingReceipt) {
      return reply.send({
        id: existingReceipt.id,
        messageId,
        userId,
        type: receiptType,
        status: 'already acknowledged',
        createdAt: existingReceipt.createdAt
      });
    }

    const receiptId = randomUUID();
    const createdAt = new Date();
    await db.execute(
      `INSERT INTO message_receipts (id, message_id, user_id, type, created_at) VALUES (?, ?, ?, ?, ?)`,
      [receiptId, messageId, userId, receiptType, createdAt]
    );

    if (process.env.REDIS_URL) {
      try {
        const redis = await getRedis();
        const receipt = { messageId, userId, type: receiptType, createdAt };
        await redis.publish(
          'jianliao:server:event',
          JSON.stringify({
            type: receiptType === 'READ' ? 'message_read' : 'message_delivered',
            conversationId,
            receipt
          })
        );
        await redis.publish(
          'jianliao:receipt:new',
          JSON.stringify({ conversationId, receipt })
        );
      } catch {
        // ignore
      }
    }

    return {
      id: receiptId,
      messageId,
      userId,
      type: receiptType,
      status: 'acknowledged',
      createdAt
    };
  });
}
