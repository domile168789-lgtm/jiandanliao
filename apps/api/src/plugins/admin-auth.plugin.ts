import { FastifyInstance, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: { id: string; role: string };
  }
}

export async function adminAuthPlugin(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest) => {
    const roleHeader = request.headers['x-admin-role'];
    if (typeof roleHeader !== 'string' || !roleHeader.trim()) return;

    const adminIdHeader = request.headers['x-admin-id'];
    const role = roleHeader.trim().toUpperCase();
    const fallbackId =
      role === 'SUPER_ADMIN' ? '10001' : role === 'OPERATOR' ? '10002' : role === 'AUDITOR' ? '10003' : '10000';
    const id =
      typeof adminIdHeader === 'string' && /^\d+$/.test(adminIdHeader.trim())
        ? adminIdHeader.trim()
        : fallbackId;

    request.admin = { id, role };
  });
}
