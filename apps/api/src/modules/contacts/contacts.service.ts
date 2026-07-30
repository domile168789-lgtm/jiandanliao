import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { previewStore } from '../im-preview/preview-store.js';

type DbUserRow = {
  id: string;
  nickname: string;
  phone: string;
};

type RelationshipRow = {
  id: string;
  fromUserId: string;
  toUserId: string;
  note: string;
  status: string;
  createdAt: string;
};

export class ContactsService {
  private async getUserByPhone(phone: string) {
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT id, nickname, phone
       FROM users
       WHERE phone = ?
       LIMIT 1`,
      [phone]
    );

    const user = rows?.[0] as DbUserRow | undefined;
    if (!user?.id) {
      throw new Error('user not found');
    }

    return user;
  }

  private async getLatestRelationship(ownerUserId: string, targetUserId: string) {
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT id,
              from_user_id AS fromUserId,
              to_user_id AS toUserId,
              note,
              status,
              created_at AS createdAt
       FROM friend_requests
       WHERE (from_user_id = ? AND to_user_id = ?)
          OR (from_user_id = ? AND to_user_id = ?)
       ORDER BY created_at DESC
       LIMIT 1`,
      [ownerUserId, targetUserId, targetUserId, ownerUserId]
    );

    return rows?.[0] as RelationshipRow | undefined;
  }

  private async getTagMap(ownerUserId: string, memberUserIds: string[]) {
    const tagMap = new Map<string, Array<{ id: string; title: string }>>();
    if (!memberUserIds.length) {
      return tagMap;
    }

    const placeholders = memberUserIds.map(() => '?').join(', ');
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT tm.user_id AS userId,
              t.id,
              t.title
       FROM contact_tags t
       JOIN contact_tag_members tm ON tm.tag_id = t.id
       WHERE t.owner_user_id = ?
         AND tm.user_id IN (${placeholders})
       ORDER BY t.created_at DESC, t.title ASC`,
      [ownerUserId, ...memberUserIds]
    );

    for (const row of rows) {
      const current = tagMap.get(row.userId) || [];
      current.push({
        id: row.id,
        title: row.title
      });
      tagMap.set(row.userId, current);
    }

    return tagMap;
  }

  private buildRelationshipState(input: {
    ownerUserId: string;
    relationship?: RelationshipRow;
  }): 'SELF' | 'FRIEND' | 'PENDING_INCOMING' | 'PENDING_OUTGOING' | 'BLOCKED' | 'NONE' {
    const relationship = input.relationship;
    if (!relationship?.id) {
      return 'NONE';
    }

    if (relationship.status === 'ACCEPTED') {
      return 'FRIEND';
    }

    if (relationship.status === 'PENDING') {
      return relationship.toUserId === input.ownerUserId ? 'PENDING_INCOMING' : 'PENDING_OUTGOING';
    }

    if (relationship.status === 'BLOCKED' && relationship.fromUserId === input.ownerUserId) {
      return 'BLOCKED';
    }

    return 'NONE';
  }

  async listContacts(phone: string) {
    if (!process.env.DATABASE_URL) {
      return previewStore.listContacts(phone);
    }

    const owner = await this.getUserByPhone(phone);
    const db = getDb();
    const candidateIds = new Set<string>();

    const [friendRows] = await db.execute<any[]>(
      `SELECT DISTINCT
          CASE
            WHEN fr.from_user_id = ? THEN fr.to_user_id
            ELSE fr.from_user_id
          END AS contactId
       FROM friend_requests fr
       WHERE fr.status = 'ACCEPTED'
         AND (fr.from_user_id = ? OR fr.to_user_id = ?)`,
      [owner.id, owner.id, owner.id]
    );
    friendRows.forEach((row) => {
      if (row.contactId) {
        candidateIds.add(row.contactId);
      }
    });

    const [dmRows] = await db.execute<any[]>(
      `SELECT DISTINCT peer.user_id AS contactId
       FROM conversation_members self_member
       JOIN conversation_members peer
         ON peer.conversation_id = self_member.conversation_id
        AND peer.user_id <> self_member.user_id
       JOIN conversations c ON c.id = self_member.conversation_id
       WHERE self_member.user_id = ?
         AND c.type = 'DM'`,
      [owner.id]
    );
    dmRows.forEach((row) => {
      if (row.contactId) {
        candidateIds.add(row.contactId);
      }
    });

    const [tagRows] = await db.execute<any[]>(
      `SELECT DISTINCT tm.user_id AS contactId
       FROM contact_tags t
       JOIN contact_tag_members tm ON tm.tag_id = t.id
       WHERE t.owner_user_id = ?`,
      [owner.id]
    );
    tagRows.forEach((row) => {
      if (row.contactId) {
        candidateIds.add(row.contactId);
      }
    });

    const ids = Array.from(candidateIds);
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    const [users] = await db.execute<any[]>(
      `SELECT id, nickname, phone
       FROM users
       WHERE id IN (${placeholders})
       ORDER BY nickname ASC`,
      ids
    );
    const tagMap = await this.getTagMap(owner.id, ids);

    return users.map((user) => ({
      id: user.id,
      name: user.nickname,
      phone: user.phone,
      tags: tagMap.get(user.id) || [],
      note: '',
      relationship: 'FRIEND' as const
    }));
  }

  async listFriendRequests(phone: string) {
    if (!process.env.DATABASE_URL) {
      return previewStore.listFriendRequests(phone);
    }

    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT fr.id,
              u.nickname AS name,
              u.phone,
              fr.note,
              CASE WHEN fr.status = 'ACCEPTED' THEN '已添加' ELSE '待通过' END AS status,
              fr.created_at AS createdAt
       FROM friend_requests fr
       JOIN users target ON target.id = fr.to_user_id
       JOIN users u ON u.id = fr.from_user_id
       WHERE target.phone = ?
       ORDER BY fr.created_at DESC`,
      [phone]
    );
    return rows;
  }

  async sendFriendRequest(input: { phone: string; targetPhone: string; note?: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.sendFriendRequest(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const target = await this.getUserByPhone(input.targetPhone);
    if (owner.id === target.id) {
      throw new Error('cannot add self');
    }

    const existing = await this.getLatestRelationship(owner.id, target.id);
    if (existing?.status === 'ACCEPTED') {
      throw new Error('already friends');
    }
    if (existing?.status === 'PENDING') {
      throw new Error('friend request already pending');
    }

    const now = new Date();
    const requestId = randomUUID();
    const note = input.note?.trim() || '你好，想加你为好友。';
    const db = getDb();
    await db.execute(
      `INSERT INTO friend_requests (id, from_user_id, to_user_id, note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
      [requestId, owner.id, target.id, note, now, now]
    );

    return {
      id: requestId,
      name: target.nickname,
      phone: target.phone,
      note,
      status: '待通过' as const,
      createdAt: now.toISOString()
    };
  }

  async acceptFriendRequest(input: { phone: string; requestId: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.acceptFriendRequest(input);
    }

    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT fr.id,
              fr.from_user_id AS fromUserId,
              target.id AS toUserId,
              source.phone AS fromPhone,
              source.nickname AS name,
              fr.note
       FROM friend_requests fr
       JOIN users target ON target.id = fr.to_user_id
       JOIN users source ON source.id = fr.from_user_id
       WHERE fr.id = ? AND target.phone = ?
       LIMIT 1`,
      [input.requestId, input.phone]
    );
    const request = rows?.[0];
    if (!request?.id) {
      throw new Error('friend request not found');
    }

    await db.execute(`UPDATE friend_requests SET status = 'ACCEPTED', updated_at = ? WHERE id = ?`, [
      new Date(),
      input.requestId
    ]);

    return {
      id: request.id,
      name: request.name,
      phone: request.fromPhone,
      note: request.note,
      status: '已添加'
    };
  }

  async getContactProfile(input: { phone: string; targetPhone: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.getContactProfile(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const target = await this.getUserByPhone(input.targetPhone);
    if (owner.id === target.id) {
      return {
        id: target.id,
        name: target.nickname,
        phone: target.phone,
        tags: [],
        note: '',
        relationship: 'SELF' as const,
        requestId: null,
        requestNote: '',
        canSendMessage: false,
        canSendRequest: false
      };
    }

    const relationship = await this.getLatestRelationship(owner.id, target.id);
    const tagMap = await this.getTagMap(owner.id, [target.id]);
    const relationshipState = this.buildRelationshipState({
      ownerUserId: owner.id,
      relationship
    });

    return {
      id: target.id,
      name: target.nickname,
      phone: target.phone,
      tags: tagMap.get(target.id) || [],
      note: relationship?.note || '',
      relationship: relationshipState,
      requestId: relationship?.id || null,
      requestNote: relationship?.note || '',
      canSendMessage: relationshipState === 'FRIEND',
      canSendRequest: relationshipState === 'NONE'
    };
  }

  async removeContact(input: { phone: string; targetPhone: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.removeContact(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const target = await this.getUserByPhone(input.targetPhone);
    const db = getDb();

    await db.execute(
      `DELETE FROM friend_requests
       WHERE (from_user_id = ? AND to_user_id = ?)
          OR (from_user_id = ? AND to_user_id = ?)`,
      [owner.id, target.id, target.id, owner.id]
    );
    await db.execute(
      `DELETE tm
       FROM contact_tag_members tm
       JOIN contact_tags t ON t.id = tm.tag_id
       WHERE t.owner_user_id = ?
         AND tm.user_id = ?`,
      [owner.id, target.id]
    );

    return {
      ok: true as const,
      status: 'REMOVED' as const
    };
  }

  async blockContact(input: { phone: string; targetPhone: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.blockContact(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const target = await this.getUserByPhone(input.targetPhone);
    const existing = await this.getLatestRelationship(owner.id, target.id);
    const db = getDb();
    const now = new Date();

    if (existing?.id) {
      await db.execute(`UPDATE friend_requests SET status = 'BLOCKED', note = ?, updated_at = ? WHERE id = ?`, [
        '已拉黑',
        now,
        existing.id
      ]);
    } else {
      await db.execute(
        `INSERT INTO friend_requests (id, from_user_id, to_user_id, note, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'BLOCKED', ?, ?)`,
        [randomUUID(), owner.id, target.id, '已拉黑', now, now]
      );
    }

    await db.execute(
      `DELETE tm
       FROM contact_tag_members tm
       JOIN contact_tags t ON t.id = tm.tag_id
       WHERE t.owner_user_id = ?
         AND tm.user_id = ?`,
      [owner.id, target.id]
    );

    return {
      ok: true as const,
      status: 'BLOCKED' as const
    };
  }

  async reportContact(input: { phone: string; targetPhone: string; reason: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.reportContact(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const target = await this.getUserByPhone(input.targetPhone);
    const reportId = randomUUID();
    await getDb().execute(
      `INSERT INTO reports (id, reporter_user_id, target_type, target_id, reason, status, created_at)
       VALUES (?, ?, 'USER', ?, ?, 'OPEN', ?)`,
      [reportId, owner.id, target.id, input.reason.trim(), new Date()]
    );

    return {
      id: reportId,
      status: 'OPEN' as const
    };
  }

  async listTags(phone: string) {
    if (!process.env.DATABASE_URL) {
      return previewStore.listTags(phone);
    }

    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT t.id,
              t.title,
              t.note,
              COUNT(tm.user_id) AS count
       FROM contact_tags t
       JOIN users owner ON owner.id = t.owner_user_id
       LEFT JOIN contact_tag_members tm ON tm.tag_id = t.id
       WHERE owner.phone = ?
       GROUP BY t.id, t.title, t.note, t.created_at
       ORDER BY t.created_at DESC`,
      [phone]
    );

    const mapped = [];
    for (const row of rows) {
      const [members] = await db.execute<any[]>(
        `SELECT u.id,
                u.nickname AS name,
                u.phone
         FROM contact_tag_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.tag_id = ?
         ORDER BY u.nickname ASC
         LIMIT 20`,
        [row.id]
      );
      mapped.push({
        id: row.id,
        title: row.title,
        count: Number(row.count || 0),
        members: members.map((item) => ({
          id: item.id,
          name: item.name,
          phone: item.phone
        })),
        note: row.note
      });
    }
    return mapped;
  }

  async listTagMembers(input: { phone: string; tagId: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.listTagMembers(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const db = getDb();
    const [tags] = await db.execute<any[]>(
      `SELECT id
       FROM contact_tags
       WHERE id = ? AND owner_user_id = ?
       LIMIT 1`,
      [input.tagId, owner.id]
    );
    if (!tags?.[0]?.id) {
      throw new Error('tag not found');
    }

    const [members] = await db.execute<any[]>(
      `SELECT u.id,
              u.nickname AS name,
              u.phone
       FROM contact_tag_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.tag_id = ?
       ORDER BY u.nickname ASC`,
      [input.tagId]
    );

    return members.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone
    }));
  }

  async addTagMember(input: { phone: string; tagId: string; contactPhone: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.addTagMember(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const target = await this.getUserByPhone(input.contactPhone);
    const db = getDb();
    const [tags] = await db.execute<any[]>(
      `SELECT id
       FROM contact_tags
       WHERE id = ? AND owner_user_id = ?
       LIMIT 1`,
      [input.tagId, owner.id]
    );
    if (!tags?.[0]?.id) {
      throw new Error('tag not found');
    }

    const [existing] = await db.execute<any[]>(
      `SELECT id
       FROM contact_tag_members
       WHERE tag_id = ? AND user_id = ?
       LIMIT 1`,
      [input.tagId, target.id]
    );
    if (existing?.[0]?.id) {
      throw new Error('contact already in tag');
    }

    await db.execute(
      `INSERT INTO contact_tag_members (id, tag_id, user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [randomUUID(), input.tagId, target.id, new Date()]
    );

    return {
      ok: true as const
    };
  }

  async removeTagMember(input: { phone: string; tagId: string; contactPhone: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.removeTagMember(input);
    }

    const owner = await this.getUserByPhone(input.phone);
    const target = await this.getUserByPhone(input.contactPhone);
    await getDb().execute(
      `DELETE tm
       FROM contact_tag_members tm
       JOIN contact_tags t ON t.id = tm.tag_id
       WHERE tm.tag_id = ?
         AND tm.user_id = ?
         AND t.owner_user_id = ?`,
      [input.tagId, target.id, owner.id]
    );

    return {
      ok: true as const
    };
  }

  async createTag(input: { phone: string; title: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.createTag(input);
    }

    const title = input.title.trim();
    if (!title) {
      throw new Error('tag title required');
    }

    const db = getDb();
    const [users] = await db.execute<any[]>(
      `SELECT id FROM users WHERE phone = ? LIMIT 1`,
      [input.phone]
    );
    const ownerId = users?.[0]?.id as string | undefined;
    if (!ownerId) {
      throw new Error('user not found');
    }

    const id = `tag-${Date.now()}`;
    await db.execute(
      `INSERT INTO contact_tags (id, owner_user_id, title, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ownerId, title, '新建标签，后续可继续补充成员。', new Date(), new Date()]
    );

    return {
      id,
      title,
      count: 0,
      members: [],
      note: '新建标签，后续可继续补充成员。'
    };
  }

  async search(input: { phone: string; keyword?: string }) {
    if (!process.env.DATABASE_URL) {
      return previewStore.search(input);
    }

    const db = getDb();
    const keyword = `%${(input.keyword || '').trim()}%`;
    const [userRows] = await db.execute<any[]>(
      `SELECT id, nickname, phone
       FROM users
       WHERE phone <> ? AND (nickname LIKE ? OR phone LIKE ?)
       ORDER BY created_at DESC
       LIMIT 10`,
      [input.phone, keyword, keyword]
    );

    const [conversationRows] = await db.execute<any[]>(
      `SELECT DISTINCT c.id, c.title, c.last_message AS lastMessage
       FROM conversations c
       JOIN conversation_members member ON member.conversation_id = c.id
       JOIN users me ON me.id = member.user_id
       WHERE me.phone = ?
         AND c.type = 'GROUP'
         AND (c.title LIKE ? OR COALESCE(c.last_message, '') LIKE ?)
       ORDER BY c.updated_at DESC
       LIMIT 10`,
      [input.phone, keyword, keyword]
    );

    const serviceRows = [
      {
        id: 'service-system',
        title: '系统通知',
        subtitle: '服务 · 公告与风控统一入口',
        type: '服务',
        to: '/h5/system-notice'
      },
      {
        id: 'service-wallet',
        title: '钱包',
        subtitle: '服务 · 余额、收付款和账单',
        type: '服务',
        to: '/h5/wallet'
      }
    ].filter((item) => `${item.title} ${item.subtitle}`.includes((input.keyword || '').trim()));

    return [
      ...userRows.map((item) => ({
        id: `contact-${item.id}`,
        title: item.nickname,
        subtitle: `联系人 · ${item.phone}`,
        type: '联系人',
        to: `/h5/contacts/profile/${encodeURIComponent(item.phone)}`
      })),
      ...conversationRows.map((item) => ({
        id: `group-${item.id}`,
        title: item.title || '未命名群聊',
        subtitle: `群聊 · ${item.lastMessage || '进入群聊查看最新消息'}`,
        type: '群聊',
        to: `/h5/chat/${item.id}`
      })),
      ...serviceRows
    ];
  }
}
