import type { FastifyInstance } from 'fastify';
import { SecurityService } from './security.service.js';

const unauthorized = { code: 'UNAUTHORIZED' } as const;
const service = new SecurityService();

export async function securityRoutes(app: FastifyInstance) {
  app.get('/security/devices', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send(unauthorized);
    return service.listDevices({
      phone: request.user.phone,
      currentDeviceId: request.user.deviceId
    });
  });

  app.get('/security/blacklist', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send(unauthorized);
    return service.listBlacklist(request.user.phone);
  });

  app.post('/security/blacklist/remove', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send(unauthorized);
    const body = request.body as { targetPhone?: string };
    if (!body.targetPhone?.trim()) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'targetPhone is required' });
    }
    return service.removeBlacklist({
      phone: request.user.phone,
      targetPhone: body.targetPhone
    });
  });

  app.get('/security/privacy', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send(unauthorized);
    return service.getPrivacy(request.user.phone);
  });

  app.post('/security/privacy', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send(unauthorized);
    const body = request.body as {
      discoverableByPhone?: boolean;
      requireFriendRequestNote?: boolean;
      allowGroupInvite?: boolean;
      showReadReceipts?: boolean;
    };
    return service.updatePrivacy({
      phone: request.user.phone,
      discoverableByPhone: body.discoverableByPhone,
      requireFriendRequestNote: body.requireFriendRequestNote,
      allowGroupInvite: body.allowGroupInvite,
      showReadReceipts: body.showReadReceipts
    });
  });

  app.post('/security/scan/resolve', async (request, reply) => {
    if (!request.user?.phone) return reply.code(401).send(unauthorized);
    const body = request.body as { fileName?: string; mimeType?: string; textContent?: string };
    return service.resolveScanResult({
      fileName: body.fileName,
      mimeType: body.mimeType,
      textContent: body.textContent
    });
  });
}
