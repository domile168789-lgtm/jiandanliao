import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { getRedis } from '../../redis.js';

export async function receiptRoutes(app: FastifyInstance) {
  app.post('/messages/:id/receipt', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    if (!process.env.DATABASE_URL) return reply.code(501).send({ code: 'NOT_IMPLEMENTED' });

    const { id: messageId } = request.params as { id: string };
    const body = request.body as { type: 'DELIVERED' | 'READ' };

    const db = getDb();
    const [userRows] = await db.execute<any[]>(`SELECT id FROM users WHERE phone = ? LIMIT 1`, [request.user.phone]);
    const userId = userRows?.[0]?.id as string | undefined;
    if (!userId) return reply.code(401).send({ code: 'UNAUTHORIZED' });

    // 找消息所属会话，便于 ws 推送
    const [msgRows] = await db.execute<any[]>(
      `SELECT conversation_id AS conversationId FROM messages WHERE id = ? LIMIT 1`,
      [messageId]
    );
    const conversationId = msgRows?.[0]?.conversationId as string | undefined;
    if (!conversationId) return reply.code(404).send({ code: 'NOT_FOUND' });

    if (body.type === 'READ') {
      const [receiptRows] = await db.execute<any[]>(
        `SELECT id, created_at AS createdAt
         FROM message_receipts
         WHERE message_id = ? AND user_id = ? AND type = ?
         LIMIT 1`,
        [messageId, userId, body.type]
      );
      const existingReceipt = receiptRows?.[0] as { id: string; createdAt: Date | string } | undefined;

      if (existingReceipt) {
        return reply.send({
          id: existingReceipt.id,
          messageId,
          userId,
          type: 'READ',
          status: 'already acknowledged',
          createdAt: existingReceipt.createdAt
        });
      }
    }

    const receiptId = randomUUID();
    const createdAt = new Date();
    await db.execute(
      `INSERT INTO message_receipts (id, message_id, user_id, type, created_at) VALUES (?, ?, ?, ?, ?)`,
      [receiptId, messageId, userId, body.type, createdAt]
    );

    if (process.env.REDIS_URL) {
      try {
        const redis = await getRedis();
        const receipt = { messageId, userId, type: body.type, createdAt };
        await redis.publish(
          'jianliao:server:event',
          JSON.stringify({
            type: 'message_read',
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
      type: body.type,
      status: 'acknowledged',
      createdAt
    };
  });
}
