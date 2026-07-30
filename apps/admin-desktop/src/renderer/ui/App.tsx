import React, { useEffect, useMemo, useState } from 'react';
import {
  loadSession,
  roleLabelMap,
  saveSession,
  type AdminSession
} from '../api/client';
import { DashboardPage } from './pages/DashboardPage';
import { ActivityCenterPage } from './pages/ActivityCenterPage';
import { AuditActionsPage } from './pages/AuditActionsPage';
import { BrandingPage } from './pages/BrandingPage';
import { FinanceReportsPage } from './pages/FinanceReportsPage';
import { GroupOwnersPage } from './pages/GroupOwnersPage';
import { GroupsPage } from './pages/GroupsPage';
import { LoginPage } from './pages/LoginPage';
import { ProxyManagementPage } from './pages/ProxyManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AnnouncementNewPage } from './pages/AnnouncementNewPage';

type Route =
  | 'dashboard'
  | 'users'
  | 'groups'
  | 'owners'
  | 'finance'
  | 'agents'
  | 'activity'
  | 'reports'
  | 'announce'
  | 'audits'
  | 'branding';

const productionRoutes: Route[] = [
  'dashboard',
  'users',
  'groups',
  'owners',
  'finance',
  'agents',
  'activity',
  'reports',
  'announce',
  'audits',
  'branding'
];

const PREVIEW_QUERY_KEY = 'preview';
const PREVIEW_QUERY_VALUE = 'demo';
const PREVIEW_SESSION: AdminSession = {
  id: 'preview-admin',
  role: 'SUPER_ADMIN',
  username: 'preview-superadmin',
  accessToken: 'preview-admin-token',
  baseUrl: '/api'
};

export const App = () => {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [route, setRoute] = useState<Route>('dashboard');

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    if (session) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(PREVIEW_QUERY_KEY) !== PREVIEW_QUERY_VALUE) return;
    setSession(PREVIEW_SESSION);
  }, [session]);

  const content = useMemo(() => {
    if (!session?.role) return <LoginPage onLogin={setSession} />;
    if (route === 'dashboard') return <DashboardPage />;
    if (route === 'users') return <UsersPage />;
    if (route === 'groups') return <GroupsPage />;
    if (route === 'owners') return <GroupOwnersPage />;
    if (route === 'finance') return <FinanceReportsPage />;
    if (route === 'agents') return <ProxyManagementPage />;
    if (route === 'activity') return <ActivityCenterPage />;
    if (route === 'reports') return <ReportsPage />;
    if (route === 'announce') return <AnnouncementNewPage />;
    if (route === 'branding') return <BrandingPage />;
    return <AuditActionsPage />;
  }, [route, session]);

  const navItems: Array<{ route: Route; label: string; hint: string }> = [
    { route: 'dashboard', label: '仪表盘', hint: '总览指标与监控' },
    { route: 'users', label: '用户管理', hint: '账户状态与封禁' },
    { route: 'groups', label: '群组管理', hint: '群组列表与活跃概览' },
    { route: 'owners', label: '群主管理', hint: '群主账号与群组归属' },
    { route: 'finance', label: '财务报表分析', hint: '收入、成本与利润分析' },
    { route: 'agents', label: '代理管理', hint: '代理层级、返点与用户规模' },
    { route: 'activity', label: '活动管理', hint: '优惠、签到、转盘与红包活动' },
    { route: 'reports', label: '举报中心', hint: '待处理风险事件' },
    { route: 'announce', label: '公告发布', hint: '系统通知投放' },
    { route: 'audits', label: '审计日志', hint: '管理员动作追踪' },
    { route: 'branding', label: '品牌配置', hint: '移动端 / PC 端品牌位' }
  ].filter((item) => productionRoutes.includes(item.route));

  const routeMeta: Record<Route, { title: string; caption: string }> = {
    dashboard: { title: '暗色总控台', caption: '复刻上传后台设计图的总览布局与数据层次。' },
    users: { title: '用户管理', caption: '查看账号状态、执行封禁，并保留桌面后台原有接口能力。' },
    groups: { title: '群组管理', caption: '查看群组规模、活跃状态与创建时间，补齐后台管理入口。' },
    owners: { title: '群主管理', caption: '查看群主账号、负责群组数与最后活跃情况。' },
    finance: { title: '财务报表分析', caption: '集中查看收入、成本、利润与风险准备金，补齐经营分析入口。' },
    agents: { title: '代理管理', caption: '查看代理层级、返点比例与代理带来的用户规模。' },
    activity: { title: '活动管理', caption: '统一查看优惠活动、签到活动、大转盘、邀请好友、轮播图与发红包配置。' },
    reports: { title: '举报中心', caption: '集中处理举报队列，快速判断风险目标与处理状态。' },
    announce: { title: '公告发布', caption: '通过管理后台发公告，适配系统级通知流程。' },
    audits: { title: '审计日志', caption: '按时间线追踪管理员动作与系统侧关键操作。' },
    branding: { title: '品牌配置', caption: '维护移动端与 PC 端品牌资产，服务多端登录页。' }
  };

  if (!session?.role) return content;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge">JL</div>
          <div className="brand-copy">
            <div className="brand-eyebrow">系统仪表盘</div>
            <div className="brand-title">柬聊 Windows 管理后台</div>
          </div>
        </div>

        <div className="sidebar-meta">
          <div className="meta-stat">
            <span className="meta-label">当前角色</span>
              <strong>{roleLabelMap[session.role] || session.role}</strong>
          </div>
          <div className="meta-stat">
            <span className="meta-label">管理员 ID</span>
            <strong>{session.id}</strong>
          </div>
          <div className="meta-stat">
            <span className="meta-label">登录账号</span>
            <strong>{session.username}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.route}
              className={`nav-item ${route === item.route ? 'active' : ''}`}
              onClick={() => setRoute(item.route)}
            >
              <span className="nav-item-label">{item.label}</span>
              <span className="nav-item-hint">{item.hint}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout" onClick={() => setSession(null)}>
            退出登录
          </button>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <div className="section-kicker">Admin Desktop</div>
            <h2>{routeMeta[route].title}</h2>
            <p className="page-subtitle">{routeMeta[route].caption}</p>
          </div>
          <div className="topbar-actions">
            <span className="pill">Electron + React</span>
            <span className="pill subtle">Windows exe Ready</span>
          </div>
        </header>
        <main className="main">{content}</main>
      </div>
    </div>
  );
};
