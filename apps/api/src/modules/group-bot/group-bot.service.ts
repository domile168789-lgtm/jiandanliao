import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';
import { ConversationService } from '../conversations/conversation.service.js';
import { MessageService } from '../messages/message.service.js';

type BotRole = 'OWNER' | 'MANAGER' | 'ADMIN' | 'FINANCE';
type AdTaskSendMode = 'NOW' | 'CUSTOM';
type AdTaskStatus = 'PENDING' | 'PROCESSING' | 'SCHEDULED' | 'DONE' | 'FAILED';

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export class GroupBotService {
  private conversationService = new ConversationService();
  private messageService = new MessageService();

  private ensureDb() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    return getDb();
  }

  private async resolveUserIdByPhone(phone: string) {
    const db = this.ensureDb();
    const [rows] = await db.execute<any[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
    const userId = rows?.[0]?.id as string | undefined;
    if (!userId) throw new Error(`user not found: ${phone}`);
    return userId;
  }

  private async ensureUserByPhone(phone: string, nickname: string) {
    const db = this.ensureDb();
    const [rows] = await db.execute<any[]>('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
    const existing = rows?.[0]?.id as string | undefined;
    if (existing) return existing;
    const id = randomUUID();
    const now = new Date();
    await db.execute(
      `INSERT INTO users (id, phone, nickname, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
      [id, phone, nickname, now, now]
    );
    return id;
  }

  private async ensureSystemBotUser() {
    return this.ensureUserByPhone('system-bot', '群机器人');
  }

  private async resolveRecipients(conversationId: string, targetRoles: BotRole[]) {
    const db = this.ensureDb();
    const recipientIds = new Map<string, BotRole>();

    if (targetRoles.includes('OWNER')) {
      const [ownerRows] = await db.execute<any[]>(
        `SELECT user_id AS userId
         FROM conversation_members
         WHERE conversation_id = ? AND role = 'OWNER'`,
        [conversationId]
      );
      ownerRows.forEach((row) => {
        if (row.userId) recipientIds.set(row.userId, 'OWNER');
      });
    }

    const systemRoleUsers: Record<Exclude<BotRole, 'OWNER'>, { phone: string; nickname: string }> = {
      MANAGER: { phone: 'system-manager-desk', nickname: '群管理席位' },
      ADMIN: { phone: 'system-admin-desk', nickname: '管理员席位' },
      FINANCE: { phone: 'system-finance-desk', nickname: '财务席位' }
    };

    for (const role of targetRoles) {
      if (role === 'OWNER') continue;
      const user = systemRoleUsers[role];
      const userId = await this.ensureUserByPhone(user.phone, user.nickname);
      recipientIds.set(userId, role);
    }

    return Array.from(recipientIds.entries()).map(([userId, role]) => ({ userId, role }));
  }

  private async deliverAlert(input: {
    alertId: string;
    conversationId: string;
    content: string;
    targetRoles: BotRole[];
  }) {
    const db = this.ensureDb();
    const botUserId = await this.ensureSystemBotUser();
    const recipients = await this.resolveRecipients(input.conversationId, input.targetRoles);
    const deliveries: Array<{
      id: string;
      alertId: string;
      targetRole: BotRole;
      targetUserId: string;
      deliveredConversationId: string;
      deliveredMessageId: string;
      createdAt: Date;
    }> = [];

    for (const recipient of recipients) {
      const conversation = await this.conversationService.ensureDmByUserIds({
        ownerUserId: botUserId,
        peerUserId: recipient.userId,
        title: '群机器人提醒'
      });
      const message = await this.messageService.create({
        conversationId: conversation.id,
        senderId: botUserId,
        type: 'TEXT',
        body: { text: input.content }
      });

      const delivery = {
        id: randomUUID(),
        alertId: input.alertId,
        targetRole: recipient.role,
        targetUserId: recipient.userId,
        deliveredConversationId: conversation.id,
        deliveredMessageId: String(message.id),
        createdAt: new Date()
      };
      await db.execute(
        `INSERT INTO group_bot_alert_deliveries
           (id, alert_id, target_role, target_user_id, delivered_conversation_id, delivered_message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          delivery.id,
          delivery.alertId,
          delivery.targetRole,
          delivery.targetUserId,
          delivery.deliveredConversationId,
          delivery.deliveredMessageId,
          delivery.createdAt
        ]
      );
      deliveries.push(delivery);
    }

    await db.execute(`UPDATE group_bot_alerts SET status = 'DELIVERED' WHERE id = ?`, [input.alertId]);
    return deliveries;
  }

  async createPurchase(input: {
    conversationId: string;
    buyerPhone: string;
    productName: string;
    amount: number;
  }) {
    const db = this.ensureDb();
    const buyerUserId = await this.resolveUserIdByPhone(input.buyerPhone);
    const now = new Date();
    const orderId = randomUUID();

    await db.execute(
      `INSERT INTO group_product_orders
         (id, conversation_id, buyer_user_id, product_name, amount, status, refund_status, refund_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PAID', 'NONE', NULL, ?, ?)`,
      [orderId, input.conversationId, buyerUserId, input.productName, input.amount, now, now]
    );

    const alert = await this.createAlert({
      conversationId: input.conversationId,
      orderId,
      triggerType: 'PURCHASE',
      content: `用户 ${input.buyerPhone} 已购买产品「${input.productName}」，金额 ${input.amount.toFixed(2)}。`,
      targetRoles: ['OWNER', 'MANAGER', 'FINANCE']
    });

    return {
      id: orderId,
      conversationId: input.conversationId,
      buyerUserId,
      productName: input.productName,
      amount: input.amount,
      status: 'PAID',
      refundStatus: 'NONE',
      createdAt: now,
      alert
    };
  }

  async requestRefund(input: {
    orderId: string;
    requesterPhone: string;
    reason: string;
  }) {
    const db = this.ensureDb();
    const requesterUserId = await this.resolveUserIdByPhone(input.requesterPhone);
    const now = new Date();

    const [orderRows] = await db.execute<any[]>(
      `SELECT id, conversation_id AS conversationId, buyer_user_id AS buyerUserId, product_name AS productName, amount
       FROM group_product_orders
       WHERE id = ?
       LIMIT 1`,
      [input.orderId]
    );
    const order = orderRows?.[0];
    if (!order) throw new Error('order not found');

    await db.execute(
      `UPDATE group_product_orders
       SET refund_status = 'REQUESTED', refund_reason = ?, updated_at = ?
       WHERE id = ? AND buyer_user_id = ?`,
      [input.reason, now, input.orderId, requesterUserId]
    );

    const alert = await this.createAlert({
      conversationId: order.conversationId,
      orderId: input.orderId,
      triggerType: 'REFUND',
      content: `用户 ${input.requesterPhone} 申请退款，产品「${order.productName}」，原因：${input.reason}。`,
      targetRoles: ['OWNER', 'MANAGER', 'FINANCE']
    });

    return {
      id: input.orderId,
      conversationId: order.conversationId,
      refundStatus: 'REQUESTED',
      reason: input.reason,
      alert
    };
  }

  async createMentionAlert(input: {
    conversationId: string;
    senderPhone: string;
    keyword: string;
    text: string;
  }) {
    const normalizedKeyword = input.keyword.trim();
    const targetRoles: BotRole[] =
      normalizedKeyword === '群主'
        ? ['OWNER', 'MANAGER']
        : normalizedKeyword === '财务'
          ? ['FINANCE']
          : ['ADMIN'];

    return this.createAlert({
      conversationId: input.conversationId,
      triggerType: 'MENTION',
      triggerKeyword: normalizedKeyword,
      content: `用户 ${input.senderPhone} 在群内提到「${normalizedKeyword}」：${input.text}`,
      targetRoles
    });
  }

  async listOrders(limit = 100) {
    const db = this.ensureDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [rows] = await db.execute<any[]>(
      `SELECT o.id,
              o.conversation_id AS conversationId,
              o.buyer_user_id AS buyerUserId,
              u.phone AS buyerPhone,
              o.product_name AS productName,
              o.amount,
              o.status,
              o.refund_status AS refundStatus,
              o.refund_reason AS refundReason,
              o.created_at AS createdAt,
              o.updated_at AS updatedAt
       FROM group_product_orders o
       LEFT JOIN users u ON u.id = o.buyer_user_id
       ORDER BY o.created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  async listAlerts(limit = 100) {
    const db = this.ensureDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [rows] = await db.execute<any[]>(
      `SELECT id,
              conversation_id AS conversationId,
              order_id AS orderId,
              trigger_type AS triggerType,
              trigger_keyword AS triggerKeyword,
              content,
              JSON_EXTRACT(target_roles, '$') AS targetRoles,
              status,
              created_at AS createdAt
       FROM group_bot_alerts
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }

  async listAdTasks(limit = 100) {
    const db = this.ensureDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [taskRows] = await db.execute<any[]>(
      `SELECT id,
              content,
              send_mode AS sendMode,
              scheduled_at AS scheduledAt,
              JSON_EXTRACT(enabled_scopes, '$') AS enabledScopes,
              status,
              created_by AS createdBy,
              created_at AS createdAt
       FROM group_ad_tasks
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );

    if (!taskRows.length) return [];

    const taskIds = taskRows.map((row) => row.id);
    const placeholders = taskIds.map(() => '?').join(', ');
    const [targetRows] = await db.execute<any[]>(
      `SELECT id,
              task_id AS taskId,
              conversation_id AS conversationId,
              status,
              delivered_message_id AS deliveredMessageId,
              created_at AS createdAt
       FROM group_ad_task_targets
       WHERE task_id IN (${placeholders})
       ORDER BY created_at ASC`,
      taskIds
    );

    const targetsByTask = new Map<string, any[]>();
    for (const row of targetRows) {
      const current = targetsByTask.get(row.taskId) ?? [];
      current.push(row);
      targetsByTask.set(row.taskId, current);
    }

    return taskRows.map((row) => {
      const targets = targetsByTask.get(row.id) ?? [];
      return {
        ...row,
        enabledScopes: parseJsonArray(row.enabledScopes),
        conversationIds: targets.map((target) => target.conversationId),
        targets
      };
    });
  }

  async createAdTask(input: {
    createdBy: string;
    conversationIds: string[];
    content: string;
    sendMode: AdTaskSendMode;
    scheduledAt?: string | null;
    enabledScopes: string[];
  }) {
    const db = this.ensureDb();
    const id = randomUUID();
    const createdAt = new Date();
    const botUserId = await this.ensureSystemBotUser();
    const conversationIds = Array.from(new Set(input.conversationIds));
    const initialStatus: AdTaskStatus = input.sendMode === 'NOW' ? 'PROCESSING' : 'SCHEDULED';

    await db.execute(
      `INSERT INTO group_ad_tasks (
         id,
         content,
         send_mode,
         scheduled_at,
         enabled_scopes,
         status,
         created_by,
         created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.content,
        input.sendMode,
        input.scheduledAt ?? null,
        JSON.stringify(input.enabledScopes),
        initialStatus,
        input.createdBy,
        createdAt
      ]
    );

    const targets: Array<{
      id: string;
      taskId: string;
      conversationId: string;
      status: 'PENDING';
      deliveredMessageId: string | null;
      createdAt: Date;
    }> = [];
    for (const conversationId of conversationIds) {
      const target = {
        id: randomUUID(),
        taskId: id,
        conversationId,
        status: 'PENDING' as const,
        deliveredMessageId: null as string | null,
        createdAt
      };
      await db.execute(
        `INSERT INTO group_ad_task_targets (
           id,
           task_id,
           conversation_id,
           status,
           delivered_message_id,
           created_at
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [target.id, target.taskId, target.conversationId, target.status, target.deliveredMessageId, target.createdAt]
      );
      targets.push(target);
    }

    if (input.sendMode === 'CUSTOM') {
      return {
        id,
        content: input.content,
        sendMode: input.sendMode,
        scheduledAt: input.scheduledAt ?? null,
        enabledScopes: input.enabledScopes,
        status: 'SCHEDULED' as AdTaskStatus,
        createdBy: input.createdBy,
        createdAt,
        conversationIds,
        targets
      };
    }

    let hasFailure = false;
    const deliveredTargets: Array<{
      id: string;
      taskId: string;
      conversationId: string;
      status: 'DELIVERED' | 'FAILED';
      deliveredMessageId: string | null;
      createdAt: Date;
    }> = [];
    for (const target of targets) {
      try {
        const message = await this.messageService.create({
          conversationId: target.conversationId,
          senderId: botUserId,
          type: 'TEXT',
          body: { text: input.content }
        });
        await db.execute(
          `UPDATE group_ad_task_targets
           SET status = 'DELIVERED', delivered_message_id = ?
           WHERE id = ?`,
          [String(message.id), target.id]
        );
        deliveredTargets.push({
          ...target,
          status: 'DELIVERED',
          deliveredMessageId: String(message.id)
        });
      } catch {
        hasFailure = true;
        await db.execute(
          `UPDATE group_ad_task_targets
           SET status = 'FAILED'
           WHERE id = ?`,
          [target.id]
        );
        deliveredTargets.push({
          ...target,
          status: 'FAILED',
          deliveredMessageId: null
        });
      }
    }

    const finalStatus: AdTaskStatus = hasFailure ? 'FAILED' : 'DONE';
    await db.execute(`UPDATE group_ad_tasks SET status = ? WHERE id = ?`, [finalStatus, id]);

    return {
      id,
      content: input.content,
      sendMode: input.sendMode,
      scheduledAt: input.scheduledAt ?? null,
      enabledScopes: input.enabledScopes,
      status: finalStatus,
      createdBy: input.createdBy,
      createdAt,
      conversationIds,
      targets: deliveredTargets
    };
  }

  private async createAlert(input: {
    conversationId: string;
    orderId?: string;
    triggerType: 'PURCHASE' | 'REFUND' | 'MENTION';
    triggerKeyword?: string;
    content: string;
    targetRoles: BotRole[];
  }) {
    const db = this.ensureDb();
    const id = randomUUID();
    const createdAt = new Date();
    await db.execute(
      `INSERT INTO group_bot_alerts
         (id, conversation_id, order_id, trigger_type, trigger_keyword, content, target_roles, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [
        id,
        input.conversationId,
        input.orderId ?? null,
        input.triggerType,
        input.triggerKeyword ?? null,
        input.content,
        JSON.stringify(input.targetRoles),
        createdAt
      ]
    );

    const deliveries = await this.deliverAlert({
      alertId: id,
      conversationId: input.conversationId,
      content: input.content,
      targetRoles: input.targetRoles
    });

    return {
      id,
      conversationId: input.conversationId,
      orderId: input.orderId ?? null,
      triggerType: input.triggerType,
      triggerKeyword: input.triggerKeyword ?? null,
      content: input.content,
      targetRoles: input.targetRoles,
      status: 'DELIVERED',
      createdAt,
      deliveries
    };
  }
}
