import multipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs';
import { FileKind, FileService, FileUploadInput } from './file.service.js';
import { consumeRateLimit, RateLimitError } from '../../shared/rate-limit.js';
import { resolveUserAccessByPhone, UserAccessError } from '../../shared/user-access.service.js';

const isValidationError = (error: unknown): error is Error =>
  error instanceof Error &&
  ['invalid file payload', 'unsupported mime type', 'blocked file type', 'file too large'].includes(error.message);

export async function fileRoutes(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 50 * 1024 * 1024
    }
  });
  const service = new FileService();

  app.post('/files/upload', async (request, reply) => {
    if (!request.user?.phone) {
      return reply.code(401).send({ code: 'UNAUTHORIZED' });
    }

    const body = request.body as Partial<FileUploadInput> | undefined;
    const input: FileUploadInput = {
      filename: body?.filename ?? '',
      mimeType: body?.mimeType ?? '',
      size: Number(body?.size ?? 0)
    };

    try {
      consumeRateLimit({
        key: `file:upload:${request.user.phone}`,
        limit: 10,
        windowMs: 60_000
      });
      await resolveUserAccessByPhone(request.user.phone);
      await service.validate(input);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return reply.code(429).send({ code: 'TOO_MANY_REQUESTS' });
      }
      if (error instanceof UserAccessError && error.message === 'user banned') {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (error instanceof UserAccessError) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      if (isValidationError(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: error.message });
      }
      throw error;
    }

    return service.createUploadMetadata(input);
  });

  app.post('/files/upload-binary', async (request, reply) => {
    if (!request.user?.phone) {
      return reply.code(401).send({ code: 'UNAUTHORIZED' });
    }

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ code: 'BAD_REQUEST', message: 'invalid file payload' });
    }

    const kindField = Array.isArray(file.fields.kind) ? file.fields.kind[0] : file.fields.kind;
    const kindValue =
      kindField && 'value' in kindField && typeof kindField.value === 'string' ? kindField.value : 'image';
    const kindHeader = String(kindValue || 'image').trim().toLowerCase();
    const kind: FileKind = kindHeader === 'voice' ? 'voice' : 'image';
    const buffer = await file.toBuffer();

    try {
      consumeRateLimit({
        key: `file:upload-binary:${request.user.phone}`,
        limit: 10,
        windowMs: 60_000
      });
      await resolveUserAccessByPhone(request.user.phone);
      return await service.saveMultipartFile({
        filename: file.filename,
        mimeType: file.mimetype,
        size: buffer.length,
        kind,
        buffer
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return reply.code(429).send({ code: 'TOO_MANY_REQUESTS' });
      }
      if (error instanceof UserAccessError && error.message === 'user banned') {
        return reply.code(403).send({ code: 'FORBIDDEN' });
      }
      if (error instanceof UserAccessError) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      if (isValidationError(error)) {
        return reply.code(400).send({ code: 'BAD_REQUEST', message: error.message });
      }
      throw error;
    }
  });

  app.get('/files/:fileId/content', async (request, reply) => {
    const { fileId } = request.params as { fileId: string };

    try {
      const stored = await service.getStoredFile(fileId);
      reply.header('Content-Type', stored.metadata.mime);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      return reply.send(createReadStream(stored.absolutePath));
    } catch {
      return reply.code(404).send({ code: 'NOT_FOUND' });
    }
  });
}
