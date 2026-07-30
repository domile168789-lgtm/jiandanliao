import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('schema', () => {
  it('contains core models', () => {
    const schema = fs.readFileSync(resolve(repoRoot, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model User');
    expect(schema).toContain('model Conversation');
    expect(schema).toContain('model Message');
    expect(schema).toContain('model AdminAction');
  });
});
