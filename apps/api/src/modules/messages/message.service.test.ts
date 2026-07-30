import { describe, expect, it } from 'vitest';
import {
  buildMessagePreview,
  MessageService,
  MessageValidationError,
  normalizeImageBody
} from './message.service';

describe('MessageService', () => {
  it('creates text message payload', async () => {
    const service = new MessageService();
    const msg = await service.create({
      conversationId: 'c1',
      senderId: 'u1',
      type: 'TEXT',
      body: { text: 'hello' }
    });
    expect(msg.type).toBe('TEXT');
    expect(msg.body.text).toBe('hello');
  });

  it('normalizes image message payload with a dedupe key', async () => {
    const service = new MessageService();
    const msg = await service.create({
      conversationId: 'c1',
      senderId: 'u1',
      type: 'IMAGE',
      body: {
        fileId: 'file-1',
        objectKey: ' uploads/images/photo.jpg ',
        mimeType: 'IMAGE/JPEG'
      }
    });

    expect(msg.type).toBe('IMAGE');
    expect(msg.body.objectKey).toBe('uploads/images/photo.jpg');
    expect(msg.body.mimeType).toBe('image/jpeg');
    expect(msg.body.dedupeKey).toBe('file-1:uploads/images/photo.jpg');
  });

  it('rejects invalid image message payloads', async () => {
    const service = new MessageService();

    await expect(
      service.create({
        conversationId: 'c1',
        senderId: 'u1',
        type: 'IMAGE',
        body: { fileId: 'file-1', mimeType: 'image/jpeg' }
      })
    ).rejects.toBeInstanceOf(MessageValidationError);
  });

  it('exports normalizeImageBody for reliability checks', () => {
    expect(
      normalizeImageBody({
        objectKey: 'uploads/images/photo.jpg',
        mimeType: 'image/jpeg',
        dedupeKey: 'custom-key'
      })
    ).toMatchObject({
      objectKey: 'uploads/images/photo.jpg',
      mimeType: 'image/jpeg',
      dedupeKey: 'custom-key'
    });
  });

  it('builds unified previews for file/audio/video/system messages', () => {
    expect(buildMessagePreview('FILE', {})).toBe('[文件]');
    expect(buildMessagePreview('AUDIO', {})).toBe('[语音]');
    expect(buildMessagePreview('VIDEO', {})).toBe('[视频]');
    expect(buildMessagePreview('SYSTEM', { title: '系统维护通知' })).toBe('系统维护通知');
    expect(buildMessagePreview('SYSTEM', {})).toBe('[系统消息]');
  });
});
