import { apiGet } from './client';

export type ProfileOverview = {
  displayName: string;
  phone: string;
  memberSince: string;
  safetyLevel: string;
};

export type WalletSummary = {
  balance: number;
  pendingIncome: number;
  currency: string;
  updatedAt: string;
};

export type EarningsSummary = {
  today: number;
  thisWeek: number;
  thisMonth: number;
};

export type AgentOverview = {
  level: string;
  teamCount: number;
  commissionRate: string;
  status: string;
};

export type SystemNotice = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  status: string;
};

export type ActivityPreview = {
  id: string;
  title: string;
  description: string;
  status: string;
};

const today = new Date().toISOString();

const fallbackProfile: ProfileOverview = {
  displayName: '柬单聊演示账号',
  phone: '855-010-888-000',
  memberSince: '2026-07-01',
  safetyLevel: '标准保护'
};

const fallbackWallet: WalletSummary = {
  balance: 1288.5,
  pendingIncome: 320,
  currency: 'USD',
  updatedAt: today
};

const fallbackEarnings: EarningsSummary = {
  today: 86,
  thisWeek: 420,
  thisMonth: 1680
};

const fallbackAgent: AgentOverview = {
  level: '高级代理',
  teamCount: 18,
  commissionRate: '18%',
  status: '已激活'
};

const fallbackNotices: SystemNotice[] = [
  {
    id: 'notice-1',
    title: '系统公告已接入会话中心',
    summary: '后台发布的公告会优先同步到系统消息入口，便于用户统一查看。',
    createdAt: today,
    status: '未读'
  },
  {
    id: 'notice-2',
    title: '账户安全巡检提醒',
    summary: '建议绑定常用设备并定期更新登录密码，保障账号与收益安全。',
    createdAt: '2026-07-28T10:00:00.000Z',
    status: '已读'
  }
];

const fallbackActivities: ActivityPreview[] = [
  {
    id: 'activity-1',
    title: '新人入驻活动',
    description: '完成资料与安全设置后可领取新人奖励。',
    status: '进行中'
  },
  {
    id: 'activity-2',
    title: '邀请奖励计划',
    description: '邀请有效用户加入后可累计本周收益。',
    status: '已发布'
  }
];

const safeGet = async <T>(path: string, fallback: T, fetcher: typeof fetch = fetch): Promise<T> => {
  try {
    return await apiGet<T>(path, fetcher);
  } catch {
    return fallback;
  }
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asProfileOverview = (value: unknown): ProfileOverview => {
  if (!isObjectRecord(value)) return fallbackProfile;
  return {
    displayName:
      typeof value.displayName === 'string' && value.displayName ? value.displayName : fallbackProfile.displayName,
    phone: typeof value.phone === 'string' && value.phone ? value.phone : fallbackProfile.phone,
    memberSince:
      typeof value.memberSince === 'string' && value.memberSince ? value.memberSince : fallbackProfile.memberSince,
    safetyLevel:
      typeof value.safetyLevel === 'string' && value.safetyLevel ? value.safetyLevel : fallbackProfile.safetyLevel
  };
};

const asWalletSummary = (value: unknown): WalletSummary => {
  if (!isObjectRecord(value)) return fallbackWallet;
  return {
    balance: typeof value.balance === 'number' ? value.balance : fallbackWallet.balance,
    pendingIncome:
      typeof value.pendingIncome === 'number' ? value.pendingIncome : fallbackWallet.pendingIncome,
    currency: typeof value.currency === 'string' && value.currency ? value.currency : fallbackWallet.currency,
    updatedAt:
      typeof value.updatedAt === 'string' && value.updatedAt ? value.updatedAt : fallbackWallet.updatedAt
  };
};

const asEarningsSummary = (value: unknown): EarningsSummary => {
  if (!isObjectRecord(value)) return fallbackEarnings;
  return {
    today: typeof value.today === 'number' ? value.today : fallbackEarnings.today,
    thisWeek: typeof value.thisWeek === 'number' ? value.thisWeek : fallbackEarnings.thisWeek,
    thisMonth: typeof value.thisMonth === 'number' ? value.thisMonth : fallbackEarnings.thisMonth
  };
};

const asAgentOverview = (value: unknown): AgentOverview => {
  if (!isObjectRecord(value)) return fallbackAgent;
  return {
    level: typeof value.level === 'string' && value.level ? value.level : fallbackAgent.level,
    teamCount: typeof value.teamCount === 'number' ? value.teamCount : fallbackAgent.teamCount,
    commissionRate:
      typeof value.commissionRate === 'string' && value.commissionRate
        ? value.commissionRate
        : fallbackAgent.commissionRate,
    status: typeof value.status === 'string' && value.status ? value.status : fallbackAgent.status
  };
};

const asSystemNotices = (value: unknown): SystemNotice[] => {
  if (!Array.isArray(value)) return fallbackNotices;
  const rows = value
    .filter((item): item is Record<string, unknown> => isObjectRecord(item))
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `notice-${index + 1}`,
      title: typeof item.title === 'string' && item.title ? item.title : fallbackNotices[0].title,
      summary:
        typeof item.summary === 'string' && item.summary ? item.summary : fallbackNotices[0].summary,
      createdAt:
        typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : fallbackNotices[0].createdAt,
      status: typeof item.status === 'string' && item.status ? item.status : fallbackNotices[0].status
    }));
  return rows.length ? rows : fallbackNotices;
};

const asActivityFeed = (value: unknown): ActivityPreview[] => {
  if (!Array.isArray(value)) return fallbackActivities;
  const rows = value
    .filter((item): item is Record<string, unknown> => isObjectRecord(item))
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `activity-${index + 1}`,
      title: typeof item.title === 'string' && item.title ? item.title : fallbackActivities[0].title,
      description:
        typeof item.description === 'string' && item.description
          ? item.description
          : fallbackActivities[0].description,
      status: typeof item.status === 'string' && item.status ? item.status : fallbackActivities[0].status
    }));
  return rows.length ? rows : fallbackActivities;
};

export function getFallbackProfileOverview() {
  return fallbackProfile;
}

export function getFallbackWalletSummary() {
  return fallbackWallet;
}

export function getFallbackEarningsSummary() {
  return fallbackEarnings;
}

export function getFallbackAgentOverview() {
  return fallbackAgent;
}

export function getFallbackSystemNotices() {
  return fallbackNotices;
}

export function getFallbackActivityFeed() {
  return fallbackActivities;
}

export async function fetchProfileOverview(fetcher: typeof fetch = fetch) {
  return asProfileOverview(await safeGet<unknown>('/api/profile/summary', fallbackProfile, fetcher));
}

export async function fetchWalletSummary(fetcher: typeof fetch = fetch) {
  return asWalletSummary(await safeGet<unknown>('/api/profile/wallet', fallbackWallet, fetcher));
}

export async function fetchEarningsSummary(fetcher: typeof fetch = fetch) {
  return asEarningsSummary(await safeGet<unknown>('/api/profile/earnings', fallbackEarnings, fetcher));
}

export async function fetchAgentOverview(fetcher: typeof fetch = fetch) {
  return asAgentOverview(await safeGet<unknown>('/api/profile/agent', fallbackAgent, fetcher));
}

export async function fetchSystemNotices(fetcher: typeof fetch = fetch) {
  return asSystemNotices(
    await safeGet<unknown>('/api/profile/system-notices', fallbackNotices, fetcher)
  );
}

export async function fetchActivityFeed(fetcher: typeof fetch = fetch) {
  return asActivityFeed(
    await safeGet<unknown>('/api/public/activity-campaigns', fallbackActivities, fetcher)
  );
}
