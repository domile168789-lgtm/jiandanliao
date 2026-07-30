import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('production env runbook', () => {
  it('documents rocky deployment and restore workflow', () => {
    const runbook = readFileSync(resolve(repoRoot, 'docs/deploy/rocky9-production-runbook.md'), 'utf-8');
    expect(runbook).toContain('Rocky 9.4');
    expect(runbook).toContain(
      'docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build',
    );
    expect(runbook).toContain('bash scripts/deploy/backup-phase1.sh');
    expect(runbook).toContain('bash scripts/deploy/restore-phase1.sh');
  });

  it('ships backup and restore scripts plus restart policy', () => {
    const compose = readFileSync(resolve(repoRoot, 'infra/compose/docker-compose.yml'), 'utf-8');
    const backup = readFileSync(resolve(repoRoot, 'scripts/deploy/backup-phase1.sh'), 'utf-8');
    const restore = readFileSync(resolve(repoRoot, 'scripts/deploy/restore-phase1.sh'), 'utf-8');
    expect(compose).toContain('restart: unless-stopped');
    expect(backup).toContain('mysqldump');
    expect(backup).toContain('tar -czf');
    expect(restore).toContain('docker compose');
    expect(restore).toContain('mysql -uroot');
  });

  it('includes the 70 percent real e2e review checklist', () => {
    const review = readFileSync(resolve(repoRoot, 'docs/local/phase1-real-e2e-review.md'), 'utf-8');
    expect(review).toContain('服务器部署是否稳定');
    expect(review).toContain('管理后台');
    expect(review).toContain('iOS / Android');
    expect(review).toContain('上传与回执链路');
  });
});
