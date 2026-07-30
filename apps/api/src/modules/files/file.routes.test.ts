import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn()
}));

vi.mock('../../db', () => ({
  getDb: () => ({
    execute: executeMock
  })
}));

import Fastify from 'fastify';
import { fileRoutes } from './file.routes';
import { resetRateLimits } from '../../shared/rate-limit';

const buildMultipartPayload = (parts: Array<{ name: string; value?: string; filename?: string; contentType?: string; data?: Buffer }>) => {
  const boundary = '----jianliao-test-boundary';
  const chunks: Buffer[] = [];

  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    if (part.filename) {
      chunks.push(
        Buffer.from(
          `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`
        )
      );
      chunks.push(Buffer.from(`Content-Type: ${part.contentType || 'application/octet-stream'}\r\n\r\n`));
      chunks.push(part.data || Buffer.alloc(0));
      chunks.push(Buffer.from('\r\n'));
    } else {
      chunks.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"\r\n\r\n`));
      chunks.push(Buffer.from(part.value || ''));
      chunks.push(Buffer.from('\r\n'));
    }
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    boundary,
    body: Buffer.concat(chunks)
  };
};

describe('fileRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = '12345678901234567890123456789012';
    process.env.MINIO_ENDPOINT = 'http://minio.local:9000';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
    resetRateLimits();
  });

  it('rejects missing auth', async () => {
    const app = Fastify();
    await app.register(fileRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload',
      payload: { filename: 'a.jpg', mimeType: 'image/jpeg', size: 1024 }
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects unsupported image mime type', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85512345678', deviceId: 'ios-1' };
    });
    await app.register(fileRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload',
      payload: { filename: 'a.svg', mimeType: 'image/svg+xml', size: 1024 }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      code: 'BAD_REQUEST',
      message: 'unsupported mime type'
    });
  });

  it('returns upload metadata for authenticated image upload', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85512345678', deviceId: 'ios-1' };
    });
    await app.register(fileRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload',
      payload: { filename: 'photo.jpg', mimeType: 'image/jpeg', size: 1024 }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      fileId: expect.any(String),
      objectKey: expect.stringContaining('photo.jpg'),
      uploadUrl: expect.any(String)
    });
    const payload = res.json() as { objectKey: string; uploadUrl: string };
    expect(payload.objectKey).toContain('uploads/images/');
    expect(payload.uploadUrl).toBe(`http://minio.local:9000/${payload.objectKey}`);
  });

  it('accepts multipart image upload and returns content url', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85512345678', deviceId: 'ios-1' };
    });
    await app.register(fileRoutes, { prefix: '/api' });

    const payload = buildMultipartPayload([
      { name: 'kind', value: 'image' },
      {
        name: 'file',
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
        data: Buffer.from('fake-image-binary')
      }
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload-binary',
      headers: {
        'content-type': `multipart/form-data; boundary=${payload.boundary}`
      },
      payload: payload.body
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      fileId: expect.any(String),
      url: expect.stringContaining('/api/files/'),
      mime: 'image/jpeg',
      size: expect.any(Number),
      width: null,
      height: null,
      durationMs: null,
      transcoded: false
    });
  });

  it('accepts multipart voice upload and marks it transcoded', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'ACTIVE' }]]);
    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85512345678', deviceId: 'ios-1' };
    });
    await app.register(fileRoutes, { prefix: '/api' });

    const payload = buildMultipartPayload([
      { name: 'kind', value: 'voice' },
      {
        name: 'file',
        filename: 'voice.webm',
        contentType: 'audio/webm',
        data: Buffer.from('fake-audio-binary')
      }
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload-binary',
      headers: {
        'content-type': `multipart/form-data; boundary=${payload.boundary}`
      },
      payload: payload.body
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      fileId: expect.any(String),
      url: expect.stringContaining('/api/files/'),
      mime: 'audio/aac',
      size: expect.any(Number),
      width: null,
      height: null,
      durationMs: null,
      transcoded: true
    });
  });

  it('rejects banned user upload', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 'u1', status: 'BANNED' }]]);
    const app = Fastify();
    app.addHook('preHandler', async (request) => {
      request.user = { phone: '85512345678', deviceId: 'ios-1' };
    });
    await app.register(fileRoutes, { prefix: '/api' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload',
      payload: { filename: 'photo.jpg', mimeType: 'image/jpeg', size: 1024 }
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ code: 'FORBIDDEN' });
  });
});
