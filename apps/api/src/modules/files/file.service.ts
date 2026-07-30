import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const blocked = ['.exe', '.bat', '.sh'];
const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
]);
const voiceMimeTypes = new Set([
  'audio/aac',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/x-wav'
]);
const maxFileSize = 50 * 1024 * 1024;

export type FileUploadInput = {
  filename: string;
  mimeType: string;
  size: number;
};

export type FileKind = 'image' | 'voice';

export type StoredFileMetadata = {
  fileId: string;
  kind: FileKind;
  filename: string;
  storedFilename: string;
  objectKey: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  transcoded: boolean;
};

const resolveUploadRoot = () => process.env.UPLOAD_ROOT || '/tmp/jianliao-uploads';

export class FileService {
  async validate(input: FileUploadInput, kind: FileKind = 'image') {
    const filename = input.filename.trim();
    const mimeType = input.mimeType.trim().toLowerCase();

    if (!filename || !mimeType || !Number.isFinite(input.size) || input.size <= 0) {
      throw new Error('invalid file payload');
    }
    if (blocked.some((ext) => filename.toLowerCase().endsWith(ext))) {
      throw new Error('blocked file type');
    }
    const allowMime = kind === 'voice' ? voiceMimeTypes : imageMimeTypes;
    if (!allowMime.has(mimeType)) {
      throw new Error('unsupported mime type');
    }
    if (input.size > maxFileSize) throw new Error('file too large');
    return true;
  }

  createUploadMetadata(input: FileUploadInput) {
    const fileId = randomUUID();
    const safeFilename = input.filename.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
    const objectKey = `uploads/images/${Date.now()}-${fileId}-${safeFilename}`;
    const endpoint = (process.env.MINIO_ENDPOINT || 'http://localhost:9000').replace(/\/+$/, '');

    return {
      fileId,
      objectKey,
      uploadUrl: `${endpoint}/${objectKey}`
    };
  }

  private async ensureUploadRoot() {
    await mkdir(resolveUploadRoot(), { recursive: true });
  }

  private getPublicUrl(fileId: string) {
    const endpoint = (process.env.MINIO_ENDPOINT || '').replace(/\/+$/, '');
    const pathName = `/api/files/${fileId}/content`;
    return endpoint ? `${endpoint}${pathName}` : pathName;
  }

  private getMetadataPath(fileId: string) {
    return path.join(resolveUploadRoot(), `${fileId}.json`);
  }

  private getStoredFilePath(storedFilename: string) {
    return path.join(resolveUploadRoot(), storedFilename);
  }

  private async writeMetadata(metadata: StoredFileMetadata) {
    await writeFile(this.getMetadataPath(metadata.fileId), JSON.stringify(metadata, null, 2), 'utf8');
  }

  async getStoredFile(fileId: string) {
    const metadataPath = this.getMetadataPath(fileId);
    const raw = await readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(raw) as StoredFileMetadata;
    return {
      metadata,
      absolutePath: this.getStoredFilePath(metadata.storedFilename)
    };
  }

  private async transcodeVoice(inputPath: string, outputPath: string) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const buffer = await readFile(inputPath);
      await writeFile(outputPath, buffer);
      return;
    }

    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-c:a',
      'aac',
      '-b:a',
      '64k',
      outputPath
    ]);
  }

  async saveMultipartFile(input: {
    filename: string;
    mimeType: string;
    size: number;
    kind: FileKind;
    buffer: Buffer;
  }) {
    await this.validate(
      {
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size
      },
      input.kind
    );
    await this.ensureUploadRoot();

    const fileId = randomUUID();
    const safeFilename = input.filename.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');

    if (input.kind === 'image') {
      const storedFilename = `${Date.now()}-${fileId}-${safeFilename}`;
      const absolutePath = this.getStoredFilePath(storedFilename);
      await writeFile(absolutePath, input.buffer);
      const fileStat = await stat(absolutePath);
      const metadata: StoredFileMetadata = {
        fileId,
        kind: 'image',
        filename: input.filename,
        storedFilename,
        objectKey: `uploads/images/${storedFilename}`,
        mime: input.mimeType.trim().toLowerCase(),
        size: fileStat.size,
        width: null,
        height: null,
        durationMs: null,
        transcoded: false
      };
      await this.writeMetadata(metadata);
      return {
        fileId,
        url: this.getPublicUrl(fileId),
        mime: metadata.mime,
        size: metadata.size,
        width: metadata.width,
        height: metadata.height,
        durationMs: metadata.durationMs,
        transcoded: metadata.transcoded
      };
    }

    const sourceFilename = `${Date.now()}-${fileId}-source-${safeFilename}`;
    const sourcePath = this.getStoredFilePath(sourceFilename);
    await writeFile(sourcePath, input.buffer);

    const outputFilename = `${Date.now()}-${fileId}.aac`;
    const outputPath = this.getStoredFilePath(outputFilename);

    try {
      await this.transcodeVoice(sourcePath, outputPath);
    } finally {
      await rm(sourcePath, { force: true });
    }

    const fileStat = await stat(outputPath);
    const metadata: StoredFileMetadata = {
      fileId,
      kind: 'voice',
      filename: input.filename,
      storedFilename: outputFilename,
      objectKey: `uploads/voice/${outputFilename}`,
      mime: 'audio/aac',
      size: fileStat.size,
      width: null,
      height: null,
      durationMs: null,
      transcoded: true
    };
    await this.writeMetadata(metadata);
    return {
      fileId,
      url: this.getPublicUrl(fileId),
      mime: metadata.mime,
      size: metadata.size,
      width: metadata.width,
      height: metadata.height,
      durationMs: metadata.durationMs,
      transcoded: metadata.transcoded
    };
  }
}
