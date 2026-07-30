import { FastifyInstance, FastifyReply } from 'fastify';
import { ProfileService } from './profile.service.js';

const unauthorized = { code: 'UNAUTHORIZED' } as const;

export async function profileRoutes(app: FastifyInstance) {
  const service = new ProfileService();
  const isBadRequest = (error: unknown) =>
    error instanceof Error && ['no profile fields'].includes(error.message);

  const resolvePhone = (phone?: string) => {
    if (!phone) {
      return null;
    }

    return phone;
  };

  const handleProfileRequest = async <T>(
    phone: string | null,
    reply: FastifyReply,
    action: (resolvedPhone: string) => Promise<T>
  ) => {
    if (!phone) {
      return reply.code(401).send(unauthorized);
    }

    try {
      return await action(phone);
    } catch (error) {
      if (error instanceof Error && error.message === 'user not found') {
        return reply.code(401).send(unauthorized);
      }
      throw error;
    }
  };

  app.get('/profile/summary', async (request, reply) =>
    handleProfileRequest(resolvePhone(request.user?.phone), reply, (phone) => service.getSummary(phone))
  );

  app.get('/profile/wallet', async (request, reply) =>
    handleProfileRequest(resolvePhone(request.user?.phone), reply, (phone) => service.getWallet(phone))
  );

  app.get('/profile/earnings', async (request, reply) =>
    handleProfileRequest(resolvePhone(request.user?.phone), reply, (phone) => service.getEarnings(phone))
  );

  app.get('/profile/agent', async (request, reply) =>
    handleProfileRequest(resolvePhone(request.user?.phone), reply, (phone) => service.getAgent(phone))
  );

  app.get('/profile/system-notices', async (request, reply) =>
    handleProfileRequest(resolvePhone(request.user?.phone), reply, (phone) => service.getSystemNotices(phone))
  );

  app.post('/profile', async (request, reply) => {
    const phone = resolvePhone(request.user?.phone);
    const body = request.body as { displayName?: string; avatarUrl?: string };

    try {
      return await handleProfileRequest(phone, reply, (resolvedPhone) =>
        service.updateOverview({
          phone: resolvedPhone,
          displayName: body.displayName,
          avatarUrl: body.avatarUrl
        })
      );
    } catch (error) {
      if (isBadRequest(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: (error as Error).message });
      }
      throw error;
    }
  });
}
