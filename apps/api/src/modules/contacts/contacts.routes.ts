import type { FastifyInstance } from 'fastify';
import { ContactsService } from './contacts.service.js';

const contactsService = new ContactsService();

export async function contactsRoutes(app: FastifyInstance) {
  const isBadRequest = (error: unknown) =>
    error instanceof Error &&
    [
      'tag title required',
      'cannot add self',
      'already friends',
      'friend request already pending',
      'contact already in tag'
    ].includes(error.message);
  const isNotFound = (error: unknown) =>
    error instanceof Error && ['friend request not found', 'user not found', 'tag not found'].includes(error.message);

  app.get('/contacts', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    return contactsService.listContacts(request.user.phone);
  });

  app.get('/contacts/friend-requests', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    return contactsService.listFriendRequests(request.user.phone);
  });

  app.post('/contacts/friend-requests', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const body = request.body as { targetPhone?: string; note?: string };
    if (!body.targetPhone?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'targetPhone is required' });
    }

    try {
      return await contactsService.sendFriendRequest({
        phone: request.user.phone,
        targetPhone: body.targetPhone,
        note: body.note
      });
    } catch (error) {
      if (isBadRequest(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: (error as Error).message });
      }
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
      }
      throw error;
    }
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

  app.get('/contacts/profile/:targetPhone', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const params = request.params as { targetPhone?: string };
    if (!params.targetPhone?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'targetPhone is required' });
    }

    try {
      return await contactsService.getContactProfile({
        phone: request.user.phone,
        targetPhone: params.targetPhone
      });
    } catch (error) {
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.post('/contacts/profile/:targetPhone/delete', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const params = request.params as { targetPhone?: string };
    if (!params.targetPhone?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'targetPhone is required' });
    }

    try {
      return await contactsService.removeContact({
        phone: request.user.phone,
        targetPhone: params.targetPhone
      });
    } catch (error) {
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.post('/contacts/profile/:targetPhone/block', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const params = request.params as { targetPhone?: string };
    if (!params.targetPhone?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'targetPhone is required' });
    }

    try {
      return await contactsService.blockContact({
        phone: request.user.phone,
        targetPhone: params.targetPhone
      });
    } catch (error) {
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.post('/contacts/profile/:targetPhone/report', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const params = request.params as { targetPhone?: string };
    const body = request.body as { reason?: string };
    if (!params.targetPhone?.trim() || !body.reason?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'targetPhone and reason are required' });
    }

    try {
      return await contactsService.reportContact({
        phone: request.user.phone,
        targetPhone: params.targetPhone,
        reason: body.reason
      });
    } catch (error) {
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
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

  app.get('/contacts/tags/:tagId/members', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const params = request.params as { tagId?: string };
    if (!params.tagId?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'tagId is required' });
    }

    try {
      return await contactsService.listTagMembers({
        phone: request.user.phone,
        tagId: params.tagId
      });
    } catch (error) {
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.post('/contacts/tags/:tagId/members', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const params = request.params as { tagId?: string };
    const body = request.body as { contactPhone?: string };
    if (!params.tagId?.trim() || !body.contactPhone?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'tagId and contactPhone are required' });
    }

    try {
      return await contactsService.addTagMember({
        phone: request.user.phone,
        tagId: params.tagId,
        contactPhone: body.contactPhone
      });
    } catch (error) {
      if (isBadRequest(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: (error as Error).message });
      }
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
      }
      throw error;
    }
  });

  app.post('/contacts/tags/:tagId/members/remove', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const params = request.params as { tagId?: string };
    const body = request.body as { contactPhone?: string };
    if (!params.tagId?.trim() || !body.contactPhone?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'tagId and contactPhone are required' });
    }

    try {
      return await contactsService.removeTagMember({
        phone: request.user.phone,
        tagId: params.tagId,
        contactPhone: body.contactPhone
      });
    } catch (error) {
      if (isNotFound(error)) {
        return reply.code(404).send({ code: 'NOT_FOUND', message: (error as Error).message });
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
