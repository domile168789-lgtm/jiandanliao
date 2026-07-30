import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('admin-desktop smoke', () => {
  it('contains full desktop admin route set for current desktop backlog', () => {
    const app = readFileSync(new URL('./ui/App.tsx', import.meta.url), 'utf-8');
    expect(app).toContain("'dashboard'");
    expect(app).toContain("'groups'");
    expect(app).toContain("'owners'");
    expect(app).toContain("'finance'");
    expect(app).toContain("'agents'");
    expect(app).toContain("'activity'");
    expect(app).toContain("'branding'");
    expect(app).toContain('productionRoutes');
    expect(app).toContain('DashboardPage');
    expect(app).toContain('BrandingPage');
  });

  it('uses real admin login instead of request header impersonation', () => {
    const login = readFileSync(new URL('./ui/pages/LoginPage.tsx', import.meta.url), 'utf-8');
    const client = readFileSync(new URL('./api/client.ts', import.meta.url), 'utf-8');
    expect(login).toContain('/admin/login');
    expect(client).toContain('Authorization');
    expect(client).not.toContain('x-admin-role');
  });

  it('contains designed dashboard sections', () => {
    const dashboard = readFileSync(new URL('./ui/pages/DashboardPage.tsx', import.meta.url), 'utf-8');
    expect(dashboard).toContain('用户总数');
    expect(dashboard).toContain('平台分布');
    expect(dashboard).toContain('最近活跃用户');
    expect(dashboard).toContain('消息动态实时监控');
  });

  it('contains branding page and windows packaging config', () => {
    const branding = readFileSync(new URL('./ui/pages/BrandingPage.tsx', import.meta.url), 'utf-8');
    const finance = readFileSync(new URL('./ui/pages/FinanceReportsPage.tsx', import.meta.url), 'utf-8');
    const pkg = readFileSync(new URL('../../package.json', import.meta.url), 'utf-8');

    expect(branding).toContain('品牌配置');
    expect(branding).toContain('上传图片');
    expect(finance).toContain('财务报表分析');
    expect(finance).toContain('月度利润表');
    expect(pkg).toContain('"dist:win"');
    expect(pkg).toContain('electron-builder --win nsis');
    expect(pkg).toContain('"nsis"');
  });

  it('contains activity center modules, creation flow and real ad task integration', () => {
    const activityPage = readFileSync(new URL('./ui/pages/ActivityCenterPage.tsx', import.meta.url), 'utf-8');
    const api = readFileSync(new URL('./api/admin.ts', import.meta.url), 'utf-8');
    const groupsPage = readFileSync(new URL('./ui/pages/GroupsPage.tsx', import.meta.url), 'utf-8');

    expect(activityPage).toContain('活动管理');
    expect(activityPage).toContain('提交活动');
    expect(activityPage).toContain('createActivityCampaign');
    expect(activityPage).toContain('优惠活动');
    expect(activityPage).toContain('签到活动');
    expect(activityPage).toContain('大转盘活动');
    expect(activityPage).toContain('邀请好友活动');
    expect(activityPage).toContain('轮播图管理');
    expect(activityPage).toContain('发红包');
    expect(api).toContain('/api/admin/activity-campaigns');
    expect(groupsPage).toContain('createGroupAdTask');
    expect(groupsPage).toContain('广告任务列表');
    expect(groupsPage).toContain('广告任务状态');
  });

  it('documents announcement feedback and page data source notes', () => {
    const announce = readFileSync(new URL('./ui/pages/AnnouncementNewPage.tsx', import.meta.url), 'utf-8');
    const branding = readFileSync(new URL('./ui/pages/BrandingPage.tsx', import.meta.url), 'utf-8');
    const groups = readFileSync(new URL('./ui/pages/GroupsPage.tsx', import.meta.url), 'utf-8');
    const finance = readFileSync(new URL('./ui/pages/FinanceReportsPage.tsx', import.meta.url), 'utf-8');
    const owners = readFileSync(new URL('./ui/pages/GroupOwnersPage.tsx', import.meta.url), 'utf-8');
    const proxy = readFileSync(new URL('./ui/pages/ProxyManagementPage.tsx', import.meta.url), 'utf-8');

    expect(announce).toContain('系统会话');
    expect(announce).toContain('/api/admin/announcements');
    expect(branding).toContain('数据来源');
    expect(groups).toContain('数据来源');
    expect(finance).toContain('推导');
    expect(owners).toContain('推导数据');
    expect(proxy).toContain('演示数据');
  });
});
