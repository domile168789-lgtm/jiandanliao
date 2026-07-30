import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { getDb } from '../../db.js';
import { consumeRateLimit, RateLimitError } from '../../shared/rate-limit.js';
import { resolveUserAccessByPhone, UserAccessError } from '../../shared/user-access.service.js';

export async function reportRoutes(app: FastifyInstance) {
  app.post('/reports', async (request, reply) => {
    if (!request.user?.phone) {
      return reply.code(401).send({ code: 'UNAUTHORIZED' });
    }
    if (!process.env.DATABASE_URL) {
      return reply.code(501).send({ code: 'NOT_IMPLEMENTED' });
    }

    const body = request.body as {
      targetType?: string;
      targetId?: string;
      reason?: string;
    };

    const targetType = typeof body?.targetType === 'string' ? body.targetType.trim() : '';
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (!targetType || !targetId || !reason) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    try {
      consumeRateLimit({
        key: `report:create:${request.user.phone}`,
        limit: 5,
        windowMs: 60_000
      });
      const access = await resolveUserAccessByPhone(request.user.phone);
      const db = getDb();
      const reportId = randomUUID();
      await db.execute(
        `INSERT INTO reports (id, reporter_user_id, target_type, target_id, reason, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'OPEN', ?)`,
        [reportId, access.userId, targetType, targetId, reason, new Date()]
      );

      return {
        id: reportId,
        status: 'OPEN'
      };
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
      throw error;
    }
  });
}

