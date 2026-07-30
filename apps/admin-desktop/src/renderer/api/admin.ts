import { request } from './client';

export type AdminUser = {
  id: string;
  phone: string;
  nickname: string;
  status: string;
  updatedAt: string;
};

export type Report = {
  id: string;
  reporterUserId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
};

export type AuditAction = {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  status: string;
  createdBy: string;
  createdAt: string;
};

export type GroupProductOrder = {
  id: string;
  conversationId: string;
  buyerUserId: string;
  buyerPhone: string | null;
  productName: string;
  amount: number;
  status: string;
  refundStatus: string;
  refundReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupBotAlert = {
  id: string;
  conversationId: string;
  orderId: string | null;
  triggerType: string;
  triggerKeyword: string | null;
  content: string;
  targetRoles: string[] | string;
  status: string;
  createdAt: string;
};

export type GroupAdTaskTarget = {
  id: string;
  taskId: string;
  conversationId: string;
  status: string;
  deliveredMessageId: string | null;
  createdAt: string;
};

export type GroupAdTask = {
  id: string;
  content: string;
  sendMode: 'NOW' | 'CUSTOM';
  scheduledAt: string | null;
  enabledScopes: string[];
  status: string;
  createdBy: string;
  createdAt: string;
  conversationIds: string[];
  targets: GroupAdTaskTarget[];
};

export type CreateGroupAdTaskInput = {
  conversationIds: string[];
  content: string;
  sendMode: 'NOW' | 'CUSTOM';
  scheduledAt?: string | null;
  enabledScopes: string[];
};

export type BrandingPlatformGroup = 'mobile' | 'pc';

export type BrandingRow = {
  platformGroup: BrandingPlatformGroup;
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
  holidayThemeAssetUrl?: string | null;
};

export type UpdateBrandingInput = {
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
  holidayThemeAssetUrl?: string | null;
};

export type ActivityCampaign = {
  id: string;
  activityType: 'DISCOUNT' | 'CHECKIN' | 'LUCKY_DRAW' | 'INVITE' | 'BANNER' | 'RED_PACKET';
  title: string;
  content: string;
  coverUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED';
  startAt: string | null;
  endAt: string | null;
  config: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateActivityCampaignInput = {
  activityType: ActivityCampaign['activityType'];
  title: string;
  content: string;
  coverUrl?: string | null;
  status?: ActivityCampaign['status'];
  startAt?: string | null;
  endAt?: string | null;
  config?: Record<string, unknown>;
};

export const getUsers = () => request<AdminUser[]>('/api/admin/users');
export const banUser = (id: string) => request(`/api/admin/users/${id}/ban`, { method: 'POST' });
export const getReports = () => request<Report[]>('/api/admin/reports');
export const resolveReport = (id: string) =>
  request(`/api/admin/reports/${id}/resolve`, { method: 'POST' });
export const createAnnouncement = (input: { title: string; content: string }) =>
  request('/api/admin/announcements', { method: 'POST', body: input });
export const getAnnouncements = () => request<Announcement[]>('/api/admin/announcements');
export const getAuditActions = () => request<AuditAction[]>('/api/admin/audit-actions');
export const getBrandingConfigs = () => request<BrandingRow[]>('/api/admin/branding');
export const updateBranding = (group: BrandingPlatformGroup, input: UpdateBrandingInput) =>
  request<BrandingRow>(`/api/admin/branding/${group}`, { method: 'PUT', body: input });
export const getGroupProductOrders = () => request<GroupProductOrder[]>('/api/admin/group-bot/orders');
export const getGroupBotAlerts = () => request<GroupBotAlert[]>('/api/admin/group-bot/alerts');
export const getGroupAdTasks = () => request<GroupAdTask[]>('/api/admin/group-bot/ad-tasks');
export const createGroupAdTask = (input: CreateGroupAdTaskInput) =>
  request<GroupAdTask>('/api/admin/group-bot/ad-tasks', { method: 'POST', body: input });
export const getActivityCampaigns = () => request<ActivityCampaign[]>('/api/admin/activity-campaigns');
export const createActivityCampaign = (input: CreateActivityCampaignInput) =>
  request<ActivityCampaign>('/api/admin/activity-campaigns', { method: 'POST', body: input });
