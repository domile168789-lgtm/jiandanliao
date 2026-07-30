import type { FastifyInstance } from 'fastify';
import { ContactsService } from './contacts.service.js';

const contactsService = new ContactsService();

export async function contactsRoutes(app: FastifyInstance) {
  app.get('/contacts/friend-requests', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    return contactsService.listFriendRequests(request.user.phone);
  });

  app.post('/contacts/friend-requests/:requestId/accept', async (request, reply) => {
      if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
      const params = request.params as { requestId?: string };
      if (!params.requestId?.trim()) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: 'requestId is required' });
      }

      try {
        return await contactsService.acceptFriendRequest({
          phone: request.user.phone,
          requestId: params.requestId
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'friend request not found') {
          return reply.code(404).send({ code: 'NOT_FOUND', message: error.message });
        }
        throw error;
      }
    });

  app.get('/contacts/tags', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    return contactsService.listTags(request.user.phone);
  });

  app.post('/contacts/tags', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as { title?: string };
    if (!body.title?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'title is required' });
    }

    try {
      return await contactsService.createTag({
        phone: request.user.phone,
        title: body.title
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'tag title required') {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: error.message });
      }
      throw error;
    }
  });

  app.get('/search', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const query = request.query as { keyword?: string };
    return contactsService.search({
      phone: request.user.phone,
      keyword: query.keyword
    });
  });
}
