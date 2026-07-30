import Fastify from 'fastify';
import { authPlugin } from './plugins/auth.plugin.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { messageRoutes } from './modules/messages/message.routes.js';
import { receiptRoutes } from './modules/messages/receipt.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { conversationRoutes } from './modules/conversations/conversation.routes.js';
import { fileRoutes } from './modules/files/file.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';
import { groupBotRoutes } from './modules/group-bot/group-bot.routes.js';
import { reportRoutes } from './modules/reports/report.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { securityRoutes } from './modules/security/security.routes.js';

const app = Fastify({ logger: true });

app.get('/api/health', async () => ({
  ok: true,
  service: 'api'
}));

await authPlugin(app);
await app.register(authRoutes, { prefix: '/api' });
await app.register(messageRoutes, { prefix: '/api' });
await app.register(receiptRoutes, { prefix: '/api' });
await app.register(adminRoutes, { prefix: '/api' });
await app.register(conversationRoutes, { prefix: '/api' });
await app.register(fileRoutes, { prefix: '/api' });
await app.register(reportRoutes, { prefix: '/api' });
await app.register(publicRoutes, { prefix: '/api' });
await app.register(groupBotRoutes, { prefix: '/api' });
await app.register(profileRoutes, { prefix: '/api' });
await app.register(contactsRoutes, { prefix: '/api' });
await app.register(securityRoutes, { prefix: '/api' });

const port = Number(process.env.PORT || 3001);
await app.listen({ port, host: '0.0.0.0' });

export { app };
