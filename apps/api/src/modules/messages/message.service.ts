import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { getRedis } from '../../redis.js';
import { ConversationService } from '../conversations/conversation.service.js';

type CreateMessageInput = {
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
  body: Record<string, any>;
};

type ImageMessageBody = {
  fileId?: string;
  objectKey: string;
  mimeType: string;
  dedupeKey: string;
  [key: string]: any;
};

type AudioMessageBody = {
  fileId?: string;
  objectKey: string;
  mimeType: string;
  dedupeKey: string;
  durationMs: number;
  [key: string]: any;
};

type SystemMessageInput = {
  targetUserId?: string;
  targetUserIds?: string[];
  category: 'system_notice' | 'moderation_result';
  title?: string;
  content: string;
  actionUrl?: string | null;
  metadata?: Record<string, any>;
};

const SERVER_EVENT_CHANNEL = 'jianliao:server:event';

export class MessageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessageValidationError';
  }
}

const ensureObjectBody = (body: unknown) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new MessageValidationError('invalid message body');
  }

  return body as Record<string, any>;
};

const normalizeStringField = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizePositiveInt = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
};

const publishServerEvent = async (event: Record<string, unknown>) => {
  if (!process.env.REDIS_URL) return;

  try {
    const redis = await getRedis();
    await redis.publish(SERVER_EVENT_CHANNEL, JSON.stringify(event));
  } catch {
    // ignore
  }
};

export const buildMessagePreview = (
  type: CreateMessageInput['type'],
  body: Record<string, any>
) => {
  if (type === 'TEXT') return String(body.text || '').slice(0, 120);
  if (type === 'IMAGE') return '[图片]';
  if (type === 'FILE') return '[文件]';
  if (type === 'AUDIO') return '[语音]';
  if (type === 'VIDEO') return '[视频]';
  if (type === 'SYSTEM') return String(body.title || '').slice(0, 120) || '[系统消息]';
  return '[消息]';
};

export const normalizeImageBody = (body: unknown): ImageMessageBody => {
  const payload = ensureObjectBody(body);
  const fileId = normalizeStringField(payload.fileId);
  const objectKey = normalizeStringField(payload.objectKey);
  const mimeType = normalizeStringField(payload.mimeType).toLowerCase();
  const dedupeKey =
    normalizeStringField(payload.dedupeKey) || [fileId || 'image', objectKey || 'missing-object'].join(':');

  if (!objectKey || !mimeType) {
    throw new MessageValidationError('missing image fields');
  }

  return {
    ...payload,
    ...(fileId ? { fileId } : {}),
    objectKey,
    mimeType,
    dedupeKey
  };
};

export const normalizeAudioBody = (body: unknown): AudioMessageBody => {
  const payload = ensureObjectBody(body);
  const fileId = normalizeStringField(payload.fileId);
  const objectKey = normalizeStringField(payload.objectKey);
  const mimeType = normalizeStringField(payload.mimeType).toLowerCase();
  const durationMs = normalizePositiveInt(payload.durationMs);
  const dedupeKey =
    normalizeStringField(payload.dedupeKey) || [fileId || 'audio', objectKey || 'missing-object'].join(':');

  if (!objectKey || !mimeType || durationMs <= 0) {
    throw new MessageValidationError('missing audio fields');
  }

  return {
    ...payload,
    ...(fileId ? { fileId } : {}),
    objectKey,
    mimeType,
    durationMs,
    dedupeKey
  };
};

export class MessageService {
  private async getUserIdByPhone(phone: string) {
    const db = getDb();
    const [rows] = await db.execute<any[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
    const userId = rows?.[0]?.id as string | undefined;
    if (!userId) throw new Error(`user not found: ${phone}`);
    return userId;
  }

  private normalizeBody(input: CreateMessageInput) {
    if (input.type === 'IMAGE') {
      return normalizeImageBody(input.body);
    }

    if (input.type === 'AUDIO') {
      return normalizeAudioBody(input.body);
    }

    return ensureObjectBody(input.body);
  }

  async create(input: CreateMessageInput) {
    const body = this.normalizeBody(input);

    // 如果已经配置了数据库连接，则优先落库；否则走占位返回（保证开发期可跑通）
    if (process.env.DATABASE_URL) {
      const db = getDb();
      const id = randomUUID();
      const createdAt = new Date();
      const preview = buildMessagePreview(input.type, body);

      await db.execute(
        `INSERT INTO messages (id, conversation_id, sender_id, type, status, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, input.conversationId, input.senderId, input.type, 'SENT', JSON.stringify(body), createdAt]
      );

      // 更新会话摘要
      await db.execute(`UPDATE conversations SET last_message = ?, updated_at = ? WHERE id = ?`, [
        preview,
        createdAt,
        input.conversationId
      ]);

      // 尝试发布到 Redis，供 WS 实时推送（失败不阻塞主流程）
      if (process.env.REDIS_URL) {
        try {
          const redis = await getRedis();
          const messagePayload = {
            id,
            conversationId: input.conversationId,
            senderId: input.senderId,
            type: input.type,
            status: 'SENT',
            body,
            createdAt
          };
          await redis.publish(
            SERVER_EVENT_CHANNEL,
            JSON.stringify({
              type: 'message_created',
              conversationId: input.conversationId,
              message: messagePayload
            })
          );
          await redis.publish(
            'jianliao:message:new',
            JSON.stringify({
              conversationId: input.conversationId,
              message: messagePayload
            })
          );
        } catch {
          // ignore
        }
      }

      return {
        id,
        conversationId: input.conversationId,
        senderId: input.senderId,
        type: input.type,
        status: 'SENT',
        body,
        createdAt
      };
    }

    return {
      id: randomUUID(),
      ...input,
      body,
      status: 'SENT',
      createdAt: new Date().toISOString()
    };
  }

  async createSystemMessage(input: SystemMessageInput) {
    const targetUserIds = Array.from(
      new Set([...(input.targetUserIds ?? []), input.targetUserId].filter((value): value is string => Boolean(value)))
    );
    const conversationService = new ConversationService();
    const systemConversation = await conversationService.ensureSystemConversation();

    if (targetUserIds.length) {
      await conversationService.ensureConversationMembers(systemConversation.id, targetUserIds);
    }

    const message = await this.create({
      conversationId: systemConversation.id,
      senderId: 'SYSTEM',
      type: 'SYSTEM',
      body: {
        category: input.category,
        title: input.title ?? '系统通知',
        content: input.content,
        actionUrl: input.actionUrl ?? null,
        ...input.metadata
      }
    });

    if (input.category === 'system_notice') {
      await publishServerEvent({
        type: 'system_notice',
        conversationId: systemConversation.id,
        noticeId: message.id,
        title: input.title ?? '系统通知',
        content: input.content,
        actionUrl: input.actionUrl ?? null,
        targetUserIds
      });
    }

    if (input.category === 'moderation_result' && input.targetUserId) {
      await publishServerEvent({
        type: 'moderation_result',
        conversationId: systemConversation.id,
        targetUserId: input.targetUserId,
        status: input.metadata?.status === 'released' ? 'released' : 'restricted',
        messageId: message.id,
        content: input.content
      });
    }

    return message;
  }

  async markConversationRead(input: { conversationId: string; phone: string }) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    const db = getDb();
    const userId = await this.getUserIdByPhone(input.phone);
    const [rows] = await db.execute<any[]>(
      `SELECT m.id
       FROM messages m
       LEFT JOIN message_receipts r
         ON r.message_id = m.id
        AND r.user_id = ?
        AND r.type = 'READ'
       WHERE m.conversation_id = ?
         AND m.sender_id <> ?
         AND r.id IS NULL`,
      [userId, input.conversationId, userId]
    );

    if (rows.length) {
      const createdAt = new Date();
      const values: any[] = [];
      const placeholders = rows
        .map((row) => {
          values.push(randomUUID(), row.id, userId, 'READ', createdAt);
          return '(?, ?, ?, ?, ?)';
        })
        .join(', ');

      await db.execute(
        `INSERT INTO message_receipts (id, message_id, user_id, type, created_at) VALUES ${placeholders}`,
        values
      );
    }

    await publishServerEvent({
      type: 'unread_updated',
      conversationId: input.conversationId,
      userId,
      unreadCount: 0
    });

    return {
      ok: true as const,
      conversationId: input.conversationId,
      unreadCount: 0,
      status: rows.length ? ('acknowledged' as const) : ('already read' as const)
    };
  }
}
