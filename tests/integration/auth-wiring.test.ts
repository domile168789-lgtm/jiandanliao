import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const apiIndex = readFileSync(resolve(repoRoot, 'apps/api/src/index.ts'), 'utf8');
const adminService = readFileSync(resolve(repoRoot, 'apps/api/src/modules/admin/admin.service.ts'), 'utf8');
const activityService = readFileSync(resolve(repoRoot, 'apps/api/src/modules/activity/activity.service.ts'), 'utf8');
const messageService = readFileSync(resolve(repoRoot, 'apps/api/src/modules/messages/message.service.ts'), 'utf8');
const receiptRoutes = readFileSync(resolve(repoRoot, 'apps/api/src/modules/messages/receipt.routes.ts'), 'utf8');
const wsEvents = readFileSync(resolve(repoRoot, 'apps/ws/src/events.ts'), 'utf8');
const wsServer = readFileSync(resolve(repoRoot, 'apps/ws/src/server.ts'), 'utf8');

describe('api auth wiring', () => {
  it('mounts authPlugin on the root app context instead of an encapsulated child plugin', () => {
    expect(apiIndex).toContain('await authPlugin(app);');
    expect(apiIndex).not.toContain('await app.register(authPlugin);');
  });

  it('wires admin-driven system notices and moderation events', () => {
    expect(wsEvents).toContain("type: 'system_notice'");
    expect(wsEvents).toContain("type: 'moderation_result'");
    expect(wsEvents).toContain("type: 'activity_published'");
    expect(messageService).toContain("type: 'message_created'");
    expect(receiptRoutes).toContain("receiptType === 'READ' ? 'message_read' : 'message_delivered'");
    expect(adminService).toContain("category: 'system_notice'");
    expect(adminService).toContain("category: 'moderation_result'");
    expect(activityService).toContain("type: 'activity_published'");
    expect(wsServer).toContain("socket.join(`user:${userId}`)");
  });
});
