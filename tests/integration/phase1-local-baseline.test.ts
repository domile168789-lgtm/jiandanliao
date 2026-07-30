import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('phase1 local baseline', () => {
  it('defines local up and smoke scripts in package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    expect(pkg.scripts['dev:phase1-up']).toBe('bash scripts/dev/phase1-up.sh');
    expect(pkg.scripts['dev:phase1-smoke']).toBe('bash scripts/dev/phase1-smoke-check.sh');
  });

  it('documents the fixed local entrypoints', () => {
    const doc = readFileSync('docs/local/phase1-e2e-checklist.md', 'utf-8');
    expect(doc).toContain('http://127.0.0.1/api');
    expect(doc).toContain('http://127.0.0.1/socket.io/');
    expect(doc).toContain('http://127.0.0.1/uploads/');
    expect(doc).toContain('pnpm dev:phase1-up');
    expect(doc).toContain('pnpm dev:phase1-smoke');
  });
});
