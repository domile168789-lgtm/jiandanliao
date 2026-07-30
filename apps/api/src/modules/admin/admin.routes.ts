import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { adminAuthPlugin, authenticateAdminCredentials, signAdminAccessToken } from '../../plugins/admin-auth.plugin.js';
import { AdminService } from './admin.service.js';
import { BrandingService } from './branding.service.js';
import { GroupBotService } from '../group-bot/group-bot.service.js';
import { ActivityService, ActivityStatus, ActivityType } from '../activity/activity.service.js';

const adminReadRoles = ['SUPER_ADMIN', 'OPERATOR', 'AUDITOR'];
const adminWriteRoles = ['SUPER_ADMIN', 'OPERATOR'];
const activityTypes: ActivityType[] = ['DISCOUNT', 'CHECKIN', 'LUCKY_DRAW', 'INVITE', 'BANNER', 'RED_PACKET'];
const activityStatuses: ActivityStatus[] = ['DRAFT', 'PUBLISHED', 'PAUSED'];

const ensureAdmin = (
  request: FastifyRequest,
  reply: FastifyReply,
  allowedRoles?: string[]
) => {
  if (!request.admin) {
    reply.code(401).send({ code: 'UNAUTHORIZED' });
    return false;
  }

  if (allowedRoles && !allowedRoles.includes(request.admin.role)) {
    reply.code(403).send({ code: 'FORBIDDEN' });
    return false;
  }

  return true;
};

export async function adminRoutes(app: FastifyInstance) {
  await adminAuthPlugin(app);
  const service = new AdminService();
  const brandingService = new BrandingService();
  const groupBotService = new GroupBotService();
  const activityService = new ActivityService();

  app.post('/admin/login', async (request, reply) => {
    const body = request.body as { username?: unknown; password?: unknown };
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const admin = authenticateAdminCredentials({ username, password });

    if (!admin) {
      return reply.code(401).send({ code: 'UNAUTHORIZED' });
    }

    return {
      accessToken: signAdminAccessToken(admin),
      admin
    };
  });

  app.get('/admin/users', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return service.listUsers();
  });

  app.get('/admin/branding', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return brandingService.list();
  });

  app.put('/admin/branding/:platformGroup', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminWriteRoles)) return;

    const { platformGroup } = request.params as { platformGroup: string };
    const body = request.body as {
      projectName?: unknown;
      logoUrl?: string | null;
      themeAssetUrl?: string | null;
      holidayThemeAssetUrl?: string | null;
    };
    const projectName = typeof body?.projectName === 'string' ? body.projectName.trim() : '';

    if (!BrandingService.isBrandingGroup(platformGroup) || !projectName) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    return brandingService.upsert({
      platformGroup,
      projectName,
      logoUrl: body.logoUrl ?? null,
      themeAssetUrl: body.themeAssetUrl ?? null,
      holidayThemeAssetUrl: body.holidayThemeAssetUrl ?? null,
      adminId: request.admin!.id
    });
  });

  app.post('/admin/users/:id/ban', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminWriteRoles)) return;
    const { id } = request.params as { id: string };
    return service.banUser(id, request.admin!.id);
  });

  app.get('/admin/reports', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return service.listReports();
  });

  app.post('/admin/reports/:id/resolve', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminWriteRoles)) return;
    const { id } = request.params as { id: string };
    return service.resolveReport(id, request.admin!.id);
  });

  app.post('/admin/announcements', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminWriteRoles)) return;
    const body = request.body as { title?: string; content?: string };
    if (!body?.title || !body?.content) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    return service.createAnnouncement({
      title: body.title,
      content: body.content,
      adminId: request.admin!.id
    });
  });

  app.get('/admin/announcements', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    const { limit } = request.query as { limit?: string };
    return service.listAnnouncements(limit ? Number(limit) : undefined);
  });

  app.get('/admin/audit-actions', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return service.listAuditActions();
  });

  app.get('/admin/group-bot/orders', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return groupBotService.listOrders();
  });

  app.get('/admin/group-bot/alerts', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return groupBotService.listAlerts();
  });

  app.get('/admin/group-bot/ad-tasks', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return groupBotService.listAdTasks();
  });

  app.post('/admin/group-bot/ad-tasks', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminWriteRoles)) return;

    const body = request.body as {
      conversationIds?: unknown;
      content?: unknown;
      sendMode?: unknown;
      scheduledAt?: unknown;
      enabledScopes?: unknown;
    };

    const conversationIds = Array.isArray(body?.conversationIds)
      ? body.conversationIds
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const sendMode = body?.sendMode === 'NOW' || body?.sendMode === 'CUSTOM' ? body.sendMode : null;
    const enabledScopes = Array.isArray(body?.enabledScopes)
      ? body.enabledScopes
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    if (!conversationIds.length || !content || !sendMode) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    let scheduledAt: string | null = null;
    if (sendMode === 'CUSTOM') {
      scheduledAt = typeof body?.scheduledAt === 'string' ? body.scheduledAt.trim() : '';
      if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
        return reply.code(400).send({ code: 'BAD_REQUEST' });
      }
    }

    return groupBotService.createAdTask({
      createdBy: request.admin!.id,
      conversationIds,
      content,
      sendMode,
      scheduledAt,
      enabledScopes
    });
  });

  app.get('/admin/activity-campaigns', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminReadRoles)) return;
    return activityService.list();
  });

  app.post('/admin/activity-campaigns', async (request, reply) => {
    if (!ensureAdmin(request, reply, adminWriteRoles)) return;

    const body = request.body as {
      activityType?: unknown;
      title?: unknown;
      content?: unknown;
      coverUrl?: unknown;
      status?: unknown;
      startAt?: unknown;
      endAt?: unknown;
      config?: unknown;
    };

    const activityType =
      typeof body?.activityType === 'string' && activityTypes.includes(body.activityType as ActivityType)
        ? (body.activityType as ActivityType)
        : null;
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const coverUrl = typeof body?.coverUrl === 'string' ? body.coverUrl.trim() : null;
    const status =
      typeof body?.status === 'string' && activityStatuses.includes(body.status as ActivityStatus)
        ? (body.status as ActivityStatus)
        : undefined;
    const startAt = typeof body?.startAt === 'string' ? body.startAt.trim() : null;
    const endAt = typeof body?.endAt === 'string' ? body.endAt.trim() : null;
    const config = body?.config && typeof body.config === 'object' && !Array.isArray(body.config) ? body.config : {};

    if (!activityType || !title || !content) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    if ((startAt && Number.isNaN(Date.parse(startAt))) || (endAt && Number.isNaN(Date.parse(endAt)))) {
      return reply.code(400).send({ code: 'BAD_REQUEST' });
    }

    return activityService.create(
      {
        activityType,
        title,
        content,
        coverUrl,
        status,
        startAt,
        endAt,
        config
      },
      request.admin!.id
    );
  });
}
