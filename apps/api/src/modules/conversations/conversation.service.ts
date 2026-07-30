import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';

export class ConversationService {
  private async getUserIdByPhone(phone: string) {
    const db = getDb();
    const [rows] = await db.execute<any[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
    const userId = rows?.[0]?.id as string | undefined;
    if (!userId) throw new Error(`user not found: ${phone}`);
    return userId;
  }

  private async getMemberContext(conversationId: string, phone: string) {
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT c.id, c.type, m.role, u.id AS userId
       FROM conversations c
       JOIN conversation_members m ON m.conversation_id = c.id
       JOIN users u ON u.id = m.user_id
       WHERE c.id = ? AND u.phone = ?
       LIMIT 1`,
      [conversationId, phone]
    );
    return rows?.[0] as
      | {
          id: string;
          type: string;
          role: string;
          userId: string;
        }
      | undefined;
  }

  async ensureSystemConversation() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT id FROM conversations WHERE type = 'SYSTEM' LIMIT 1`
    );
    const existingId = rows?.[0]?.id as string | undefined;
    if (existingId) return { id: existingId, type: 'SYSTEM' };

    const now = new Date();
    const conversationId = randomUUID();
    await db.execute(
      `INSERT INTO conversations (id, type, title, last_message, updated_at) VALUES (?, 'SYSTEM', ?, NULL, ?)`,
      [conversationId, '系统消息', now]
    );
    return { id: conversationId, type: 'SYSTEM' };
  }

  async ensureConversationMembers(conversationId: string, userIds: string[]) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    if (!userIds.length) return { inserted: 0 };
    const db = getDb();
    const now = new Date();

    // conversation_members 有 uniq_conv_user (conversation_id, user_id)
    // 使用 INSERT IGNORE 以避免重复插入导致失败
    const values: any[] = [];
    const placeholders = userIds
      .map((userId) => {
        values.push(randomUUID(), conversationId, userId, now);
        return `(?, ?, ?, 'MEMBER', ?)`;
      })
      .join(', ');

    await db.execute(
      `INSERT IGNORE INTO conversation_members (id, conversation_id, user_id, role, joined_at)
       VALUES ${placeholders}`,
      values
    );

    return { inserted: userIds.length };
  }

  async ensureSystemConversationMembers(userIds: string[]) {
    const systemConversation = await this.ensureSystemConversation();
    await this.ensureConversationMembers(systemConversation.id, userIds);
    return systemConversation;
  }

  async ensureDmByUserIds(input: { ownerUserId: string; peerUserId: string; title?: string | null }) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT c.id, c.type, c.updated_at AS updatedAt
       FROM conversations c
       JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
       JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
       WHERE c.type = 'DM'
       LIMIT 1`,
      [input.ownerUserId, input.peerUserId]
    );

    if (rows?.[0]) {
      return rows[0];
    }

    const now = new Date();
    const conversationId = randomUUID();
    await db.execute(
      `INSERT INTO conversations (id, type, title, last_message, updated_at) VALUES (?, 'DM', ?, NULL, ?)`,
      [conversationId, input.title ?? null, now]
    );

    await db.execute(
      `INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
       VALUES (?, ?, ?, 'OWNER', ?), (?, ?, ?, 'MEMBER', ?)`,
      [randomUUID(), conversationId, input.ownerUserId, now, randomUUID(), conversationId, input.peerUserId, now]
    );

    return { id: conversationId, type: 'DM', updatedAt: now };
  }

  async createDmByPhones(input: { ownerPhone: string; peerPhone: string }) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const ownerId = await this.getUserIdByPhone(input.ownerPhone);
    const peerId = await this.getUserIdByPhone(input.peerPhone);

    return this.ensureDmByUserIds({ ownerUserId: ownerId, peerUserId: peerId });
  }

  async createGroupByPhones(input: { ownerPhone: string; title: string; memberPhones: string[] }) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const ownerId = await this.getUserIdByPhone(input.ownerPhone);
    const memberIds = Array.from(new Set(input.memberPhones.map((phone) => phone.trim()).filter(Boolean)));
    const resolvedMemberIds = (
      await Promise.all(memberIds.map(async (phone) => this.getUserIdByPhone(phone)))
    ).filter((userId) => userId !== ownerId);

    if (!resolvedMemberIds.length) {
      throw new Error('group requires at least one member');
    }

    const now = new Date();
    const conversationId = randomUUID();
    await db.execute(
      `INSERT INTO conversations (id, type, title, last_message, updated_at) VALUES (?, 'GROUP', ?, NULL, ?)`,
      [conversationId, input.title.trim(), now]
    );

    const values: any[] = [randomUUID(), conversationId, ownerId, now];
    const placeholders = [`(?, ?, ?, 'OWNER', ?)`];

    for (const userId of resolvedMemberIds) {
      values.push(randomUUID(), conversationId, userId, now);
      placeholders.push(`(?, ?, ?, 'MEMBER', ?)`);
    }

    await db.execute(
      `INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
       VALUES ${placeholders.join(', ')}`,
      values
    );

    return {
      id: conversationId,
      type: 'GROUP',
      title: input.title.trim(),
      memberCount: resolvedMemberIds.length + 1,
      updatedAt: now
    };
  }

  async inviteGroupMembersByPhones(input: {
    conversationId: string;
    operatorPhone: string;
    memberPhones: string[];
  }) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const operator = await this.getMemberContext(input.conversationId, input.operatorPhone);

    if (!operator) {
      throw new Error('forbidden conversation access');
    }
    if (operator.type !== 'GROUP') {
      throw new Error('group only operation');
    }
    if (operator.role !== 'OWNER') {
      throw new Error('group owner required');
    }

    const normalizedPhones = Array.from(
      new Set(input.memberPhones.map((phone) => phone.trim()).filter(Boolean))
    );
    const memberIds = (
      await Promise.all(normalizedPhones.map(async (phone) => this.getUserIdByPhone(phone)))
    ).filter((userId) => userId !== operator.userId);

    if (!memberIds.length) {
      throw new Error('group requires at least one member');
    }

    await this.ensureConversationMembers(input.conversationId, memberIds);
    await db.execute(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [new Date(), input.conversationId]);

    return {
      id: input.conversationId,
      invitedCount: memberIds.length
    };
  }

  async leaveGroupByPhone(input: { conversationId: string; phone: string }) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const member = await this.getMemberContext(input.conversationId, input.phone);

    if (!member) {
      throw new Error('forbidden conversation access');
    }
    if (member.type !== 'GROUP') {
      throw new Error('group only operation');
    }

    await db.execute(`DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?`, [
      input.conversationId,
      member.userId
    ]);
    await db.execute(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [new Date(), input.conversationId]);

    return {
      id: input.conversationId,
      left: true
    };
  }

  async listByPhone(phone: string) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT c.id, c.type, c.title, c.last_message AS lastMessage, c.updated_at AS updatedAt
       FROM conversations c
       JOIN conversation_members m ON m.conversation_id = c.id
       JOIN users u ON u.id = m.user_id
       WHERE u.phone = ?
       ORDER BY c.updated_at DESC
       LIMIT 100`,
      [phone]
    );
    return rows;
  }

  async assertConversationMember(conversationId: string, phone: string) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT 1
       FROM conversation_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = ? AND u.phone = ?
       LIMIT 1`,
      [conversationId, phone]
    );

    if (!rows?.length) {
      throw new Error('forbidden conversation access');
    }
  }
}
