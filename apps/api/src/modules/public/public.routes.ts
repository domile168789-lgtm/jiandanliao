import { FastifyInstance } from 'fastify';
import { BrandingService } from '../admin/branding.service.js';

export async function publicRoutes(app: FastifyInstance) {
  const brandingService = new BrandingService();

  app.get('/public/branding', async (request, reply) => {
    const { group } = request.query as { group?: string };

    if (!group || !BrandingService.isBrandingGroup(group)) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    const branding = await brandingService.getByGroup(group);
    if (!branding) {
      return reply.code(404).send({ code: 'NOT_FOUND' });
    }

    return branding;
  });
}
