import { getDb } from '../../db.js';
import { previewStore } from '../im-preview/preview-store.js';

export class ContactsService {
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
        `SELECT u.nickname
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
        members: members.map((item) => item.nickname),
        note: row.note
      });
    }
    return mapped;
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
        to: '/h5/contacts/friends'
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
