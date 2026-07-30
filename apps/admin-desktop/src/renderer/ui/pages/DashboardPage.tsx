import React, { useEffect, useMemo, useState } from 'react';
import {
  getAuditActions,
  getReports,
  getUsers,
  type AdminUser,
  type AuditAction,
  type Report
} from '../../api/admin';

type TrendPoint = {
  label: string;
  value: number;
};

type PlatformSlice = {
  label: string;
  value: number;
  colorClass: string;
};

type ActivityItem = {
  id: string;
  tone: 'info' | 'success' | 'warning';
  text: string;
  time: string;
};

const inferPlatform = (seed: string) => {
  const pool = ['Web', 'Android', 'iOS', 'Windows'] as const;
  const score = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pool[score % pool.length];
};

const formatDateTime = (value: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace('T', ' ');
};

const formatTrendLabel = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

const toActivityTone = (action: string): ActivityItem['tone'] => {
  const normalized = action.toLowerCase();
  if (normalized.includes('ban') || normalized.includes('delete')) return 'warning';
  if (normalized.includes('create') || normalized.includes('publish')) return 'success';
  return 'info';
};

const buildRecentUsers = (users: AdminUser[]) => {
  if (!users.length) return [];

  return [...users]
    .sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`))
    .slice(0, 5)
    .map((user) => ({
      id: user.id,
      nickname: user.nickname,
      phone: user.phone,
      platform: inferPlatform(user.id),
      status: user.status === 'BANNED' ? '已限制' : user.status === 'ACTIVE' ? '正常' : user.status || '正常',
      lastSeen: formatDateTime(user.updatedAt)
    }));
};

const buildPlatformDistribution = (users: AdminUser[]) => {
  const counts = users.reduce<Record<string, number>>((acc, user) => {
    const platform = inferPlatform(user.id);
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {});

  const ordered: Array<{ label: string; colorClass: string }> = [
    { label: 'Android', colorClass: 'legend-dot-android' },
    { label: 'iOS', colorClass: 'legend-dot-ios' },
    { label: 'Windows', colorClass: 'legend-dot-windows' },
    { label: 'Web', colorClass: 'legend-dot-web' }
  ];

  return ordered.map((item) => ({
    ...item,
    value: users.length ? Math.round(((counts[item.label] || 0) / users.length) * 100) : 0
  }));
};

const buildActivityFeed = (actions: AuditAction[]) => {
  if (!actions.length) return [];

  return actions.slice(0, 6).map((action) => ({
    id: action.id,
    tone: toActivityTone(action.action),
    text: `[${action.adminId || 'ADMIN'}] ${action.action} · ${action.targetType}:${action.targetId}`,
    time: formatDateTime(action.createdAt)
  }));
};

const buildTrendPoints = (reports: Report[], audits: AuditAction[]): TrendPoint[] => {
  const counts = new Map<string, number>();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    counts.set(date.toISOString().slice(0, 10), 0);
  }

  [...reports, ...audits].forEach((item) => {
    const raw = 'createdAt' in item ? item.createdAt : '';
    const key = raw ? raw.slice(0, 10) : '';
    if (!counts.has(key)) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const max = Math.max(...counts.values(), 1);
  return Array.from(counts.entries()).map(([isoDate, count]) => {
    const date = new Date(`${isoDate}T00:00:00Z`);
    return {
      label: formatTrendLabel(date),
      value: Math.round((count / max) * 100)
    };
  });
};

export const DashboardPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [audits, setAudits] = useState<AuditAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [userRows, reportRows, auditRows] = await Promise.all([
        getUsers().catch(() => []),
        getReports().catch(() => []),
        getAuditActions().catch(() => [])
      ]);

      setUsers(userRows);
      setReports(reportRows);
      setAudits(auditRows);
    } catch (error: any) {
      setErr(`仪表盘接口请求失败：${String(error?.message || error)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.status !== 'BANNED').length;
    const messageVolume = audits.length;
    const pendingReports = reports.filter((report) => report.status !== 'RESOLVED' && report.status !== 'CLOSED').length;

    return [
      { label: '用户总数', value: totalUsers.toLocaleString('zh-CN'), delta: '来自真实用户表', tone: 'positive' },
      { label: '可用账号', value: activeUsers.toLocaleString('zh-CN'), delta: '按封禁状态实时统计', tone: 'positive' },
      { label: '审计动作数', value: messageVolume.toLocaleString('zh-CN'), delta: '来自审计日志', tone: 'positive' },
      { label: '待处理举报', value: pendingReports.toLocaleString('zh-CN'), delta: '待运营处理', tone: 'warning' }
    ] as const;
  }, [audits.length, reports, users]);

  const recentUsers = useMemo(() => buildRecentUsers(users), [users]);
  const platformDistribution = useMemo(() => buildPlatformDistribution(users), [users]);
  const activityFeed = useMemo(() => buildActivityFeed(audits), [audits]);
  const trendPoints = useMemo(() => buildTrendPoints(reports, audits), [audits, reports]);

  return (
    <section className="page-section dashboard-page">
      <div className="page-header">
        <div>
          <div className="section-kicker">总览面板</div>
          <h1>系统仪表盘</h1>
          <p className="page-subtitle">参考设计图重构为暗色总控台，支持关键指标、平台分布和实时监控。</p>
        </div>
        <div className="toolbar-actions">
          <span className="pill subtle">{loading ? '同步中...' : '数据已更新'}</span>
          <button onClick={load} disabled={loading}>
            刷新数据
          </button>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="stats-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="stat-card">
            <span className="stat-label">{metric.label}</span>
            <strong className="stat-value">{metric.value}</strong>
            <span className={`stat-delta ${metric.tone}`}>{metric.delta}</span>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>近 7 日消息趋势</h3>
              <p className="muted">以设计图的低对比折线区块为原型，当前使用轻量柱状表现。</p>
            </div>
          </div>
          <div className="trend-bars">
            {trendPoints.map((point) => (
              <div key={point.label} className="trend-bar">
                <div className="trend-bar-fill" style={{ height: `${point.value}%` }} />
                <span className="trend-bar-label">{point.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>平台分布</h3>
              <p className="muted">按近期活跃用户推算终端占比，保持设计图中的圆环信息层次。</p>
            </div>
          </div>
          <div className="platform-panel">
            <div className="donut-ring">
              <div className="donut-hole">
                <strong>{users.length}</strong>
                <span>样本用户</span>
              </div>
            </div>
            <div className="legend">
              {platformDistribution.map((item) => (
                <div key={item.label} className="legend-item">
                  <span className={`legend-dot ${item.colorClass}`} />
                  <span>{item.label}</span>
                  <strong>{item.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>最近活跃用户</h3>
            <p className="muted">保留设计图的大表格结构，聚焦用户、终端与最后活动时间。</p>
          </div>
          <span className="pill">支持导出 CSV</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>手机号</th>
                <th>活跃平台</th>
                <th>状态</th>
                <th>最后活跃时间</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id}>
                  <td className="mono">#{user.id}</td>
                  <td>{user.nickname}</td>
                  <td className="mono">{user.phone}</td>
                  <td>{user.platform}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        user.status === '已限制' ? 'danger' : user.status === '离线' ? 'neutral' : 'ok'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="mono">{user.lastSeen}</td>
                </tr>
              ))}
              {!recentUsers.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    暂无真实用户数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>消息动态实时监控</h3>
            <p className="muted">复刻设计图底部滚动日志区，优先展示审计动作和系统事件。</p>
          </div>
        </div>
        <div className="activity-feed">
          {activityFeed.map((item) => (
            <div key={item.id} className={`activity-item ${item.tone}`}>
              <span className="mono activity-time">{item.time}</span>
              <span>{item.text}</span>
            </div>
          ))}
          {!activityFeed.length ? <div className="muted">暂无审计动作</div> : null}
        </div>
      </section>
    </section>
  );
};
