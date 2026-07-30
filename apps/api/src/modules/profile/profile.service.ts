import { getDb } from '../../db.js';

type ProfileRecord = {
  id: string;
  phone: string;
  nickname: string | null;
  status: string;
  createdAt: string | Date;
};

type ActivityNoticeRow = {
  id: string;
  title: string;
  content: string | null;
  createdAt: string | Date;
};

const fallbackCreatedAt = '2026-07-01T00:00:00.000Z';
const fallbackAvatarUrl = 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20messaging%20app%20user%20avatar%2C%20friendly%20asian%20business%20portrait%2C%20clean%20background%2C%20modern%20product%20style&image_size=square_hd';
const profileOverrides = new Map<string, { displayName?: string; avatarUrl?: string | null }>();

const getPhoneTail = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-4) || '0000';
};

const getPhoneSeed = (phone: string) =>
  phone
    .replace(/\D/g, '')
    .split('')
    .reduce((sum, digit) => sum + Number(digit || 0), 0);

const toDateOnly = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const toIsoString = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = new Date(value);
  return Number.isNaN(normalized.getTime()) ? fallbackCreatedAt : normalized.toISOString();
};

const clampMoney = (value: number) => Number(value.toFixed(2));

export class ProfileService {
  private async getProfileRecord(phone: string): Promise<ProfileRecord> {
    const override = profileOverrides.get(phone);

    if (!process.env.DATABASE_URL) {
      return {
        id: `mock-${phone}`,
        phone,
        nickname: override?.displayName || `用户${getPhoneTail(phone)}`,
        status: 'ACTIVE',
        createdAt: fallbackCreatedAt
      };
    }

    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT id, phone, nickname, status, created_at AS createdAt
       FROM users
       WHERE phone = ?
       LIMIT 1`,
      [phone]
    );

    const row = rows?.[0] as ProfileRecord | undefined;
    if (!row?.id) {
      throw new Error('user not found');
    }

    return row;
  }

  async getSummary(phone: string) {
    const profile = await this.getProfileRecord(phone);
    const override = profileOverrides.get(phone);
    return {
      displayName: override?.displayName || profile.nickname || `用户${getPhoneTail(phone)}`,
      phone: profile.phone,
      memberSince: toDateOnly(profile.createdAt),
      safetyLevel: profile.status === 'BANNED' ? '受限保护' : '标准保护',
      avatarUrl: override?.avatarUrl === undefined ? fallbackAvatarUrl : override.avatarUrl
    };
  }

  async updateOverview(input: { phone: string; displayName?: string; avatarUrl?: string }) {
    const displayName = input.displayName?.trim();
    const avatarUrl = input.avatarUrl?.trim();

    if (!displayName && avatarUrl === undefined) {
      throw new Error('no profile fields');
    }

    if (!process.env.DATABASE_URL) {
      const current = profileOverrides.get(input.phone) || {};
      profileOverrides.set(input.phone, {
        displayName: displayName || current.displayName,
        avatarUrl: avatarUrl === undefined ? current.avatarUrl : avatarUrl || null
      });
      return this.getSummary(input.phone);
    }

    await this.getProfileRecord(input.phone);

    if (displayName) {
      const db = getDb();
      await db.execute(`UPDATE users SET nickname = ?, updated_at = ? WHERE phone = ?`, [
        displayName,
        new Date(),
        input.phone
      ]);
    }

    if (avatarUrl !== undefined) {
      const current = profileOverrides.get(input.phone) || {};
      profileOverrides.set(input.phone, {
        displayName: displayName || current.displayName,
        avatarUrl: avatarUrl || null
      });
    }

    return this.getSummary(input.phone);
  }

  async getWallet(phone: string) {
    await this.getProfileRecord(phone);
    const seed = getPhoneSeed(phone);
    return {
      balance: clampMoney(1000 + seed * 8.5),
      pendingIncome: clampMoney(120 + seed * 2.75),
      currency: 'USD',
      updatedAt: new Date().toISOString()
    };
  }

  async getEarnings(phone: string) {
    await this.getProfileRecord(phone);
    const seed = getPhoneSeed(phone);
    return {
      today: clampMoney(20 + seed * 0.8),
      thisWeek: clampMoney(160 + seed * 3.6),
      thisMonth: clampMoney(720 + seed * 12.5)
    };
  }

  async getAgent(phone: string) {
    await this.getProfileRecord(phone);
    const seed = getPhoneSeed(phone);
    const levels = ['普通代理', '高级代理', '渠道代理'] as const;
    const commissionRates = ['12%', '18%', '24%'] as const;
    const index = seed % levels.length;

    return {
      level: levels[index],
      teamCount: 6 + (seed % 25),
      commissionRate: commissionRates[index],
      status: '已激活'
    };
  }

  async getSystemNotices(phone: string) {
    const profile = await this.getProfileRecord(phone);
    const notices = [
      {
        id: `account-${profile.id}`,
        title: profile.status === 'BANNED' ? '账号状态提醒' : '欢迎使用柬单聊',
        summary:
          profile.status === 'BANNED'
            ? '当前账号处于受限状态，请联系平台运营或查看系统通知中的风控说明。'
            : '你的账号资料、钱包和收益入口已完成后端接入，可在我的页直接查看。',
        createdAt: toIsoString(profile.createdAt),
        status: profile.status === 'BANNED' ? '未读' : '已读'
      }
    ];

    if (!process.env.DATABASE_URL) {
      notices.push({
        id: 'notice-fallback-safety',
        title: '账户安全巡检提醒',
        summary: '建议绑定常用设备并定期更新登录密码，保障账号与收益安全。',
        createdAt: fallbackCreatedAt,
        status: '未读'
      });
      return notices;
    }

    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT id, title, content, created_at AS createdAt
       FROM activity_campaigns
       WHERE status = 'PUBLISHED'
       ORDER BY created_at DESC
       LIMIT 4`
    );

    const activityNotices = (rows as ActivityNoticeRow[]).map((row) => ({
      id: `activity-${row.id}`,
      title: row.title,
      summary: row.content?.trim().slice(0, 80) || '官方活动已发布，可前往发现页或活动中心查看详情。',
      createdAt: toIsoString(row.createdAt),
      status: '未读'
    }));

    if (!activityNotices.length) {
      activityNotices.push({
        id: 'notice-default-activity',
        title: '官方活动持续更新中',
        summary: '后续发布的新活动会优先同步到系统通知入口，方便统一查看。',
        createdAt: new Date().toISOString(),
        status: '未读'
      });
    }

    return notices.concat(activityNotices);
  }
}
