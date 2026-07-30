import { describe, expect, it } from 'vitest';
import { FileService } from './file.service';

describe('FileService', () => {
  it('rejects executable uploads', async () => {
    const service = new FileService();
    await expect(service.validate({ filename: 'hack.exe', mimeType: 'application/x-msdownload', size: 128 })).rejects.toThrow(
      'blocked file type'
    );
  });
});

