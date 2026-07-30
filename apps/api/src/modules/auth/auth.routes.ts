import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { consumeRateLimit, RateLimitError } from '../../shared/rate-limit.js';

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService();

  app.post('/auth/register', async (request, reply) => {
    const body = request.body as { phone: string; password: string; deviceId: string; platform?: string; nickname?: string };
    try {
      consumeRateLimit({
        key: `auth:register:${request.ip}:${body.phone || 'unknown'}`,
        limit: 3,
        windowMs: 60_000
      });
      return await service.register(body);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return reply.code(429).send({ code: 'TOO_MANY_REQUESTS' });
      }
      throw error;
    }
  });

  app.post('/auth/login/password', async (request, reply) => {
    const body = request.body as { phone: string; password: string; deviceId: string; platform?: string };
    try {
      consumeRateLimit({
        key: `auth:login:${request.ip}:${body.phone || 'unknown'}`,
        limit: 5,
        windowMs: 60_000
      });
      return await service.loginWithPassword(body);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return reply.code(429).send({ code: 'TOO_MANY_REQUESTS' });
      }
      if (
        error instanceof Error &&
        ['invalid password', 'no password set', 'user not found'].includes(error.message)
      ) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      if (error instanceof Error && error.message === 'user banned') {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      throw error;
    }
  });

  app.post('/auth/refresh-token', async (request) => {
    const body = request.body as { phone: string; refreshToken: string; deviceId: string };
    return service.refreshToken(body);
  });
}
