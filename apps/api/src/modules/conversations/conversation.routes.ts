import { FastifyInstance } from 'fastify';
import { ConversationService } from './conversation.service.js';

export async function conversationRoutes(app: FastifyInstance) {
  const service = new ConversationService();
  const isForbiddenConversationAccess = (error: unknown) =>
    error instanceof Error && error.message === 'forbidden conversation access';
  const isGroupOwnerRequired = (error: unknown) =>
    error instanceof Error && error.message === 'group owner required';
  const isGroupOnlyOperation = (error: unknown) =>
    error instanceof Error && error.message === 'group only operation';
  const isBadRequest = (error: unknown) =>
    error instanceof Error &&
    [
      'group requires at least one member',
      'group requires at least 3 members including owner',
      'memberPhones must contain at least 2 items'
    ].includes(error.message);
  const isUserNotFound = (error: unknown) =>
    error instanceof Error && error.message.startsWith('user not found:');

  app.get('/conversations', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    return service.listByPhone(request.user.phone);
  });

  app.post('/conversations/dm', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as { peerPhone: string };
    return service.createDmByPhones({ ownerPhone: request.user.phone, peerPhone: body.peerPhone });
  });

  app.post('/conversations/group', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as { title?: string; memberPhones?: string[] };
    if (!Array.isArray(body?.memberPhones) || body.memberPhones.length < 2) {
      return reply
        .code(400)
        .send({ code: 'BAD_REQUEST', message: 'memberPhones must contain at least 2 items' });
    }

    try {
      return await service.createGroupByPhones({
        ownerPhone: request.user.phone,
        title: body.title,
        memberPhones: body.memberPhones
      });
    } catch (error) {
      if (isBadRequest(error) || isUserNotFound(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.get('/conversations/:id/members', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const { id } = request.params as { id: string };

    try {
      return await service.listConversationMembers({
        conversationId: id,
        phone: request.user.phone
      });
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (isGroupOnlyOperation(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.post('/conversations/:id/invite', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const { id } = request.params as { id: string };
    const body = request.body as { memberPhones?: string[] };
    if (!Array.isArray(body?.memberPhones)) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    try {
      return await service.inviteGroupMembersByPhones({
        conversationId: id,
        operatorPhone: request.user.phone,
        memberPhones: body.memberPhones
      });
    } catch (error) {
      if (isForbiddenConversationAccess(error) || isGroupOwnerRequired(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (isGroupOnlyOperation(error) || isBadRequest(error) || isUserNotFound(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.post('/conversations/:id/leave', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const { id } = request.params as { id: string };

    try {
      return await service.leaveGroupByPhone({
        conversationId: id,
        phone: request.user.phone
      });
    } catch (error) {
      if (isForbiddenConversationAccess(error)) {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (isGroupOnlyOperation(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: (error as Error).message });
      }
      throw error;
    }
  });
}
