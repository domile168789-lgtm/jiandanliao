import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('admin console baseline', () => {
  it('desktop admin remains the single console with runtime base url and bearer auth login flow', () => {
    const desktopClient = readFileSync('apps/admin-desktop/src/renderer/api/client.ts', 'utf-8');
    const desktopLogin = readFileSync(
      'apps/admin-desktop/src/renderer/ui/pages/LoginPage.tsx',
      'utf-8'
    );

    expect(desktopClient).toContain('baseUrl?: string');
    expect(desktopClient).toContain('Authorization');
    expect(desktopClient).toContain('Bearer ${session.accessToken}');
    expect(desktopLogin).toContain('API Base URL');
    expect(desktopLogin).toContain('/admin/login');
    expect(desktopLogin).toContain('Bearer Token');
  });

  it('documents the single admin flow', () => {
    const doc = readFileSync('docs/local/phase1-admin-e2e.md', 'utf-8');
    expect(doc).toContain('GET /api/admin/users');
    expect(doc).toContain('POST /api/admin/users/:id/ban');
    expect(doc).toContain('POST /api/admin/announcements');
    expect(doc).toContain('GET /api/admin/audit-actions');
  });

  it('avoids parameterized LIMIT queries in admin list reads for server mysql compatibility', () => {
    const adminService = readFileSync('apps/api/src/modules/admin/admin.service.ts', 'utf-8');
    expect(adminService).not.toContain('LIMIT ?');
    expect(adminService).toContain('LIMIT ${safeLimit}');
  });
});
