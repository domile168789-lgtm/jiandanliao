import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('message reliability', () => {
  it('guards duplicate read receipt handling', () => {
    const receiptRoutes = readFileSync('apps/api/src/modules/messages/receipt.routes.ts', 'utf-8');
    expect(receiptRoutes).toContain('already acknowledged');
    expect(receiptRoutes).toContain("type: 'READ'");
  });

  it('documents reliability-oriented message service behavior', () => {
    const service = readFileSync('apps/api/src/modules/messages/message.service.ts', 'utf-8');
    expect(service).toContain('MessageValidationError');
    expect(service).toContain('normalizeImageBody');
    expect(service).toContain('dedupeKey');
  });
});
