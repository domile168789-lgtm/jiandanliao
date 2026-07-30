import { FastifyInstance } from 'fastify';
import { MessageService, MessageValidationError } from './message.service.js';
import { getDb } from '../../db.js';
import { ConversationService } from '../conversations/conversation.service.js';
import { consumeRateLimit, RateLimitError } from '../../shared/rate-limit.js';
import { resolveUserAccessByPhone, UserAccessError } from '../../shared/user-access.service.js';
import { previewStore } from '../im-preview/preview-store.js';

const isForbiddenConversationAccess = (error: unknown) =>
  error instanceof Error && error.message === 'forbidden conversation access';

export async function messageRoutes(app: FastifyInstance) {
  const service = new MessageService();
  const conversationService = new ConversationService();

  app.get('/messages', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    try {
      await resolveUserAccessByPhone(request.user.phone);
    } catch (error) {
      if (error instanceof UserAccessError && error.message === 'user banned') {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (error instanceof UserAccessError) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      throw error;
    }
    const { conversationId, limit } = request.query as { conversationId: string; limit?: string };
    if (!conversationId) return reply.code(400).send({ code: 'BAD_REQUEST' });

    try {
      await conversationService.assertConversationMember(conversationId, request.user.phone);
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      throw error;
    }

    if (!process.env.DATABASE_URL) {
      return previewStore.listMessages({
        conversationId,
        phone: request.user.phone,
        limit: Number(limit || 50)
      });
    }

    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT id, conversation_id AS conversationId, sender_id AS senderId, type, status,
              JSON_EXTRACT(body, '$') AS body, created_at AS createdAt
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [conversationId, Math.min(Number(limit || 50), 200)]
    );
    return rows;
  });

  app.post('/messages', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as {
      conversationId: string;
      type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
      body: Record<string, any>;
    };

    try {
      await conversationService.assertConversationMember(body.conversationId, request.user.phone);
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      throw error;
    }

    try {
      consumeRateLimit({
        key: `message:create:${request.user.phone}`,
        limit: 20,
        windowMs: 10_000
      });
      const access = await resolveUserAccessByPhone(request.user.phone);
      if (!process.env.DATABASE_URL) {
        return previewStore.createMessage({
          conversationId: body.conversationId,
          phone: request.user.phone,
          type: body.type,
          body: body.body
        });
      }
      return await service.create({ ...body, senderId: access.userId });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return reply.code(429).send({ code: 'TOO_MANY_REQUESTS' });
      }
      if (error instanceof UserAccessError && error.message === 'user banned') {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (error instanceof UserAccessError) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      if (error instanceof MessageValidationError) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: error.message });
      }
      throw error;
    }
  });

  app.post('/messages/read', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as { conversationId?: string };
    if (!body?.conversationId) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    try {
      await resolveUserAccessByPhone(request.user.phone);
      await conversationService.assertConversationMember(body.conversationId, request.user.phone);

      if (!process.env.DATABASE_URL) {
        return previewStore.markConversationRead({
          phone: request.user.phone,
          conversationId: body.conversationId
        });
      }

      return await service.markConversationRead({
        phone: request.user.phone,
        conversationId: body.conversationId
      });
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (error instanceof UserAccessError && error.message === 'user banned') {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (error instanceof UserAccessError) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      throw error;
    }
  });
}
