import { getDb } from '../../db.js';

export type SecurityDeviceRow = {
  deviceId: string;
  platform: string;
  lastActiveAt: string;
  isCurrent: boolean;
  status: '当前设备' | '已登录';
};

export type SecurityBlacklistRow = {
  phone: string;
  name: string;
  blockedAt: string;
  reason: string;
};

export type SecurityPrivacySettings = {
  discoverableByPhone: boolean;
  requireFriendRequestNote: boolean;
  allowGroupInvite: boolean;
  showReadReceipts: boolean;
};

export type ScanResolveResult = {
  code: string;
  title: string;
  description: string;
  to: string;
  actionLabel: string;
  source: 'image' | 'demo';
};

const fallbackTime = '2026-07-30T08:00:00.000Z';
const defaultPrivacy: SecurityPrivacySettings = {
  discoverableByPhone: true,
  requireFriendRequestNote: true,
  allowGroupInvite: true,
  showReadReceipts: false
};

const privacyStore = new Map<string, SecurityPrivacySettings>();
const blacklistStore = new Map<string, SecurityBlacklistRow[]>();

const getPhoneTail = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-4) || '0000';
};

const getBlacklistRows = (phone: string) => {
  if (!blacklistStore.has(phone)) {
    blacklistStore.set(phone, [
      {
        phone: '855010188003',
        name: '风控专员 May',
        blockedAt: fallbackTime,
        reason: '已关闭临时通知同步'
      }
    ]);
  }
  return blacklistStore.get(phone) || [];
};

const getPrivacySettings = (phone: string) => {
  if (!privacyStore.has(phone)) {
    privacyStore.set(phone, { ...defaultPrivacy });
  }
  return privacyStore.get(phone) || { ...defaultPrivacy };
};

const normalizeScanResult = (payload: string): ScanResolveResult => {
  const normalized = payload.trim().toLowerCase();
  const matchedFriend = normalized.match(/friend:([0-9]+)/);

  if (matchedFriend) {
    const phone = matchedFriend[1] || '855010188001';
    return {
      code: `friend:${phone}`,
      title: '识别到好友二维码',
      description: `已识别联系人手机号 ${phone}，可继续前往新的朋友页发起好友申请。`,
      to: '/h5/contacts/friends',
      actionLabel: '去添加朋友',
      source: 'image'
    };
  }

  if (normalized.includes('wallet:')) {
    return {
      code: 'wallet:collect',
      title: '识别到收付款码',
      description: '该二维码已解析为钱包入口，可继续查看余额、收付款和账单。',
      to: '/h5/wallet',
      actionLabel: '前往钱包',
      source: 'image'
    };
  }

  if (normalized.includes('poster:')) {
    return {
      code: 'poster:new-user-campaign',
      title: '识别到活动海报',
      description: '该内容已解析为活动素材，可继续前往看一看查看推荐内容。',
      to: '/h5/discover/channels',
      actionLabel: '查看活动内容',
      source: 'image'
    };
  }

  return {
    code: payload.trim() || 'demo:search',
    title: '识别到普通内容',
    description: '当前图片已完成解析，你可以继续前往搜一搜查看关联服务或联系人。',
    to: '/h5/discover/search',
    actionLabel: '去搜一搜',
    source: 'image'
  };
};

export class SecurityService {
  async listDevices(input: { phone: string; currentDeviceId?: string }): Promise<SecurityDeviceRow[]> {
    if (!process.env.DATABASE_URL) {
      const currentDeviceId = input.currentDeviceId || 'web-preview-device';
      return [
        {
          deviceId: currentDeviceId,
          platform: 'H5',
          lastActiveAt: new Date().toISOString(),
          isCurrent: true,
          status: '当前设备'
        },
        {
          deviceId: `ios-${getPhoneTail(input.phone)}`,
          platform: 'IOS',
          lastActiveAt: fallbackTime,
          isCurrent: false,
          status: '已登录'
        }
      ];
    }

    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT d.device_id AS deviceId,
              d.platform AS platform,
              d.updated_at AS updatedAt
       FROM users u
       JOIN user_devices d ON d.user_id = u.id
       WHERE u.phone = ?
       ORDER BY d.updated_at DESC`,
      [input.phone]
    );

    if (!rows.length) {
      return [];
    }

    return rows.map((row) => {
      const isCurrent = row.deviceId === input.currentDeviceId;
      return {
        deviceId: row.deviceId,
        platform: String(row.platform || 'UNKNOWN').toUpperCase(),
        lastActiveAt: new Date(row.updatedAt || fallbackTime).toISOString(),
        isCurrent,
        status: isCurrent ? '当前设备' : '已登录'
      };
    });
  }

  async listBlacklist(phone: string): Promise<SecurityBlacklistRow[]> {
    return getBlacklistRows(phone).map((item) => ({ ...item }));
  }

  async removeBlacklist(input: { phone: string; targetPhone: string }) {
    const current = getBlacklistRows(input.phone);
    const next = current.filter((item) => item.phone !== input.targetPhone);
    blacklistStore.set(input.phone, next);
    return {
      ok: true as const,
      targetPhone: input.targetPhone,
      remainingCount: next.length
    };
  }

  async getPrivacy(phone: string): Promise<SecurityPrivacySettings> {
    return { ...getPrivacySettings(phone) };
  }

  async updatePrivacy(input: { phone: string } & Partial<SecurityPrivacySettings>) {
    const current = getPrivacySettings(input.phone);
    const next: SecurityPrivacySettings = {
      discoverableByPhone:
        typeof input.discoverableByPhone === 'boolean' ? input.discoverableByPhone : current.discoverableByPhone,
      requireFriendRequestNote:
        typeof input.requireFriendRequestNote === 'boolean'
          ? input.requireFriendRequestNote
          : current.requireFriendRequestNote,
      allowGroupInvite: typeof input.allowGroupInvite === 'boolean' ? input.allowGroupInvite : current.allowGroupInvite,
      showReadReceipts:
        typeof input.showReadReceipts === 'boolean' ? input.showReadReceipts : current.showReadReceipts
    };
    privacyStore.set(input.phone, next);
    return { ...next };
  }

  async resolveScanResult(input: {
    fileName?: string;
    mimeType?: string;
    textContent?: string;
  }): Promise<ScanResolveResult> {
    const payload = [input.textContent, input.fileName, input.mimeType].filter(Boolean).join(' ').trim();
    return normalizeScanResult(payload || 'demo:search');
  }
}
