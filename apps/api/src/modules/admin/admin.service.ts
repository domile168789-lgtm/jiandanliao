import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { MessageService } from '../messages/message.service.js';
import { RiskService } from '../risk/risk.service.js';

export class AdminService {
  async listUsers(limit = 100) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [rows] = await db.execute<any[]>(
      `SELECT id, phone, nickname, status, updated_at AS updatedAt
       FROM users
       ORDER BY updated_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  async banUser(userId: string, adminId: string) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();

    await db.execute(
      `UPDATE users
       SET status = 'BANNED', updated_at = NOW()
       WHERE id = ?`,
      [userId]
    );

    await this.recordAction({
      adminId,
      action: 'BAN_USER',
      targetType: 'USER',
      targetId: userId
    });

    try {
      const riskService = new RiskService();
      const moderation = riskService.buildModerationResult({
        blocked: true,
        projectName: '柬单聊'
      });
      const messageService = new MessageService();
      await messageService.createSystemMessage({
        targetUserId: userId,
        category: 'moderation_result',
        title: '账号状态变更',
        content: moderation.content,
        metadata: {
          status: moderation.status
        }
      });
    } catch {
      // ignore
    }

    return { id: userId, status: 'BANNED', audited: true };
  }

  async listReports(limit = 100) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [rows] = await db.execute<any[]>(
      `SELECT id,
              reporter_user_id AS reporterUserId,
              target_type AS targetType,
              target_id AS targetId,
              reason,
              status,
              created_at AS createdAt
       FROM reports
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  async resolveReport(reportId: string, adminId: string) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();

    await db.execute(
      `UPDATE reports
       SET status = 'CLOSED'
       WHERE id = ?`,
      [reportId]
    );

    await this.recordAction({
      adminId,
      action: 'RESOLVE_REPORT',
      targetType: 'REPORT',
      targetId: reportId
    });

    return {
      id: reportId,
      status: 'CLOSED',
      audited: true
    };
  }

  async createAnnouncement(input: { title: string; content: string; adminId: string }) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const announcementId = randomUUID();

    await db.execute(
      `INSERT INTO announcements (id, title, content, status, created_by, created_at)
       VALUES (?, ?, ?, 'PUBLISHED', ?, NOW())`,
      [announcementId, input.title, input.content, input.adminId]
    );

    await this.recordAction({
      adminId: input.adminId,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'ANNOUNCEMENT',
      targetId: announcementId
    });

    // 将公告写入系统会话，供用户端展示（失败不影响公告创建）
    try {
      const [userRows] = await db.execute<any[]>(
        `SELECT id FROM users WHERE status = 'ACTIVE' ORDER BY updated_at DESC LIMIT 1000`
      );
      const userIds = (userRows || [])
        .map((row) => row?.id as string | undefined)
        .filter((id): id is string => Boolean(id));

      if (userIds.length) {
        const messageService = new MessageService();
        await messageService.createSystemMessage({
          targetUserIds: userIds,
          category: 'system_notice',
          title: input.title,
          content: input.content,
          actionUrl: '/h5/messages'
        });
      }
    } catch {
      // ignore
    }

    return { id: announcementId, status: 'PUBLISHED', audited: true };
  }

  async listAnnouncements(limit = 20) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 50);
    const [rows] = await db.execute<any[]>(
      `SELECT id,
              title,
              content,
              status,
              created_by AS createdBy,
              created_at AS createdAt
       FROM announcements
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  async listAuditActions(limit = 100) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [rows] = await db.execute<any[]>(
      `SELECT id,
              admin_id AS adminId,
              action,
              target_type AS targetType,
              target_id AS targetId,
              created_at AS createdAt
       FROM admin_actions
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  private async recordAction(input: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
  }) {
    const db = getDb();
    await db.execute(
      `INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [randomUUID(), input.adminId, input.action, input.targetType, input.targetId]
    );
  }
}
