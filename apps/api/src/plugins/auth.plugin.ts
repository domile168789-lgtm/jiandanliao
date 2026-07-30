import { FastifyInstance, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../modules/auth/token.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { phone: string; deviceId?: string };
  }
}

export async function authPlugin(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    if (!header) return;
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) return;

    try {
      const payload = verifyAccessToken(token);
      request.user = { phone: payload.sub, deviceId: payload.deviceId };
    } catch {
      // token 无效则视为未登录（后续需要鉴权的路由会主动拒绝）
    }
  });
}
