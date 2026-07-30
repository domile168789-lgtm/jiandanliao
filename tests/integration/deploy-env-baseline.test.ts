import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('deploy env baseline', () => {
  it('uses env placeholders in compose', () => {
    const compose = readFileSync(resolve(repoRoot, 'infra/compose/docker-compose.yml'), 'utf-8');
    expect(compose).toContain('${JWT_SECRET:-');
    expect(compose).toContain('${MYSQL_ROOT_PASSWORD:-');
    expect(compose).toContain('${MINIO_ROOT_USER:-');
    expect(compose).toContain('${MINIO_ROOT_PASSWORD:-');
  });

  it('ships an env example for server deploy', () => {
    const envExample = readFileSync(resolve(repoRoot, 'infra/compose/.env.example'), 'utf-8');
    expect(envExample).toContain('JWT_SECRET=');
    expect(envExample).toContain('MYSQL_ROOT_PASSWORD=');
    expect(envExample).toContain('MINIO_ROOT_USER=');
    expect(envExample).toContain('MINIO_ROOT_PASSWORD=');
  });

  it('makes init schema application safe to rerun', () => {
    const initScript = readFileSync(resolve(repoRoot, 'scripts/deploy/init-phase1-data-compose.sh'), 'utf-8');
    expect(initScript).toContain("table_name='messages'");
    expect(initScript).toContain('[init] schema already present, skipping schema apply');
    expect(initScript).toContain('INSERT INTO reports');
    expect(initScript).toContain("'r_demo_1'");
  });

  it('requires CI to build the desktop admin artifact', () => {
    const workflow = readFileSync(resolve(repoRoot, '.github/workflows/ci.yml'), 'utf-8');
    expect(workflow).toContain('@jianliao/admin-desktop');
    expect(workflow).not.toContain('@jianliao/admin-web');
  });
});
