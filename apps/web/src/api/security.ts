import { apiGet, apiPost } from './client';
import { withDemoFallback, type LoadableData } from './loadable';

export type SecurityDeviceRow = {
  deviceId: string;
  platform: string;
  lastActiveAt: string;
  isCurrent: boolean;
  status: string;
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

let fallbackDevices: SecurityDeviceRow[] = [
  {
    deviceId: 'web-preview-device',
    platform: 'H5',
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
    status: '当前设备'
  },
  {
    deviceId: 'ios-0000',
    platform: 'IOS',
    lastActiveAt: '2026-07-30T08:00:00.000Z',
    isCurrent: false,
    status: '已登录'
  }
];

let fallbackBlacklist: SecurityBlacklistRow[] = [
  {
    phone: '855010188003',
    name: '风控专员 May',
    blockedAt: '2026-07-30T08:00:00.000Z',
    reason: '已关闭临时通知同步'
  }
];

let fallbackPrivacy: SecurityPrivacySettings = {
  discoverableByPhone: true,
  requireFriendRequestNote: true,
  allowGroupInvite: true,
  showReadReceipts: false
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asDeviceRows = (value: unknown): SecurityDeviceRow[] => {
  if (!Array.isArray(value)) return fallbackDevices;
  const rows = value
    .filter((item): item is Record<string, unknown> => isObjectRecord(item))
    .map((item, index) => ({
      deviceId: typeof item.deviceId === 'string' && item.deviceId ? item.deviceId : `device-${index + 1}`,
      platform: typeof item.platform === 'string' && item.platform ? item.platform : 'UNKNOWN',
      lastActiveAt:
        typeof item.lastActiveAt === 'string' && item.lastActiveAt ? item.lastActiveAt : new Date().toISOString(),
      isCurrent: Boolean(item.isCurrent),
      status: typeof item.status === 'string' && item.status ? item.status : '已登录'
    }));
  return rows.length ? rows : fallbackDevices;
};

const asBlacklistRows = (value: unknown): SecurityBlacklistRow[] => {
  if (!Array.isArray(value)) return fallbackBlacklist;
  const rows = value
    .filter((item): item is Record<string, unknown> => isObjectRecord(item))
    .map((item, index) => ({
      phone: typeof item.phone === 'string' && item.phone ? item.phone : `85501018800${index}`,
      name: typeof item.name === 'string' && item.name ? item.name : `黑名单联系人 ${index + 1}`,
      blockedAt:
        typeof item.blockedAt === 'string' && item.blockedAt ? item.blockedAt : '2026-07-30T08:00:00.000Z',
      reason: typeof item.reason === 'string' && item.reason ? item.reason : '手动加入黑名单'
    }));
  return rows;
};

const asPrivacySettings = (value: unknown): SecurityPrivacySettings => {
  if (!isObjectRecord(value)) return fallbackPrivacy;
  return {
    discoverableByPhone:
      typeof value.discoverableByPhone === 'boolean' ? value.discoverableByPhone : fallbackPrivacy.discoverableByPhone,
    requireFriendRequestNote:
      typeof value.requireFriendRequestNote === 'boolean'
        ? value.requireFriendRequestNote
        : fallbackPrivacy.requireFriendRequestNote,
    allowGroupInvite: typeof value.allowGroupInvite === 'boolean' ? value.allowGroupInvite : fallbackPrivacy.allowGroupInvite,
    showReadReceipts:
      typeof value.showReadReceipts === 'boolean' ? value.showReadReceipts : fallbackPrivacy.showReadReceipts
  };
};

const resolveLocalScanPayload = (payload: string): ScanResolveResult => {
  const normalized = payload.trim().toLowerCase();
  const matchedFriend = normalized.match(/friend:([0-9]+)/);

  if (matchedFriend) {
    return {
      code: `friend:${matchedFriend[1]}`,
      title: '识别到好友二维码',
      description: '当前图片已解析为好友二维码，可前往新的朋友页继续处理。',
      to: '/h5/contacts/friends',
      actionLabel: '去添加朋友',
      source: 'demo'
    };
  }

  if (normalized.includes('wallet:')) {
    return {
      code: 'wallet:collect',
      title: '识别到收付款码',
      description: '当前图片已解析为钱包入口，可继续查看余额、账单和收付款。',
      to: '/h5/wallet',
      actionLabel: '前往钱包',
      source: 'demo'
    };
  }

  if (normalized.includes('poster:')) {
    return {
      code: 'poster:new-user-campaign',
      title: '识别到活动海报',
      description: '当前图片已解析为活动素材，可继续前往看一看查看推荐内容。',
      to: '/h5/discover/channels',
      actionLabel: '查看活动内容',
      source: 'demo'
    };
  }

  return {
    code: payload.trim() || 'demo:search',
    title: '识别到普通内容',
    description: '当前图片已完成解析，可继续前往搜一搜查看关联内容。',
    to: '/h5/discover/search',
    actionLabel: '去搜一搜',
    source: 'demo'
  };
};

export async function loadSecurityDevices(fetcher: typeof fetch = fetch): Promise<LoadableData<SecurityDeviceRow[]>> {
  return withDemoFallback(
    async () => {
      const rows = asDeviceRows(await apiGet<unknown>('/api/security/devices', fetcher));
      fallbackDevices = rows;
      return rows;
    },
    fallbackDevices,
    '设备列表接口暂不可用，当前展示演示设备。'
  );
}

export async function loadSecurityBlacklist(
  fetcher: typeof fetch = fetch
): Promise<LoadableData<SecurityBlacklistRow[]>> {
  return withDemoFallback(
    async () => {
      const rows = asBlacklistRows(await apiGet<unknown>('/api/security/blacklist', fetcher));
      fallbackBlacklist = rows;
      return rows;
    },
    fallbackBlacklist,
    '黑名单接口暂不可用，当前展示演示名单。'
  );
}

export async function loadPrivacySettings(
  fetcher: typeof fetch = fetch
): Promise<LoadableData<SecurityPrivacySettings>> {
  return withDemoFallback(
    async () => {
      const settings = asPrivacySettings(await apiGet<unknown>('/api/security/privacy', fetcher));
      fallbackPrivacy = settings;
      return settings;
    },
    fallbackPrivacy,
    '隐私设置接口暂不可用，当前展示演示配置。'
  );
}

export async function updatePrivacySettings(
  input: Partial<SecurityPrivacySettings>,
  fetcher: typeof fetch = fetch
): Promise<SecurityPrivacySettings> {
  try {
    const settings = asPrivacySettings(await apiPost<unknown>('/api/security/privacy', input, fetcher));
    fallbackPrivacy = settings;
    return settings;
  } catch {
    fallbackPrivacy = { ...fallbackPrivacy, ...input };
    return fallbackPrivacy;
  }
}

export async function removeBlacklistContact(
  targetPhone: string,
  fetcher: typeof fetch = fetch
): Promise<{ ok: true; targetPhone: string; remainingCount: number }> {
  try {
    const payload = await apiPost<{ ok: true; targetPhone: string; remainingCount: number }>(
      '/api/security/blacklist/remove',
      { targetPhone },
      fetcher
    );
    fallbackBlacklist = fallbackBlacklist.filter((item) => item.phone !== targetPhone);
    return payload;
  } catch {
    fallbackBlacklist = fallbackBlacklist.filter((item) => item.phone !== targetPhone);
    return {
      ok: true,
      targetPhone,
      remainingCount: fallbackBlacklist.length
    };
  }
}

export async function resolveScanImage(
  file: File,
  fetcher: typeof fetch = fetch
): Promise<ScanResolveResult> {
  let textContent = '';
  try {
    textContent = await file.text();
  } catch {
    textContent = '';
  }

  try {
    return (await apiPost<ScanResolveResult>(
      '/api/security/scan/resolve',
      {
        fileName: file.name,
        mimeType: file.type,
        textContent
      },
      fetcher
    )) as ScanResolveResult;
  } catch {
    return resolveLocalScanPayload(textContent || file.name);
  }
}
