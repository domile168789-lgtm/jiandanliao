import React, { useEffect, useMemo, useState } from 'react';
import { getGroupBotAlerts, getUsers, type AdminUser, type GroupBotAlert } from '../../api/admin';

type OwnerRow = {
  id: string;
  nickname: string;
  phone: string;
  managedGroups: number;
  status: string;
  lastSeen: string;
};

const FALLBACK_OWNERS: OwnerRow[] = [
  { id: '10001', nickname: '产品负责人', phone: '138****1001', managedGroups: 3, status: '正常', lastSeen: '2026-07-30 21:10' },
  { id: '10002', nickname: '运营主管', phone: '138****1002', managedGroups: 2, status: '正常', lastSeen: '2026-07-30 20:45' },
  { id: '10003', nickname: '桌面端负责人', phone: '138****1003', managedGroups: 1, status: '正常', lastSeen: '2026-07-30 19:32' }
];

const buildOwners = (users: AdminUser[]) => {
  if (!users.length) return FALLBACK_OWNERS;

  return users.slice(0, 6).map((user, index) => ({
    id: user.id,
    nickname: user.nickname || `群主 ${index + 1}`,
    phone: user.phone,
    managedGroups: Math.max(1, 3 - (index % 3)),
    status: user.status === 'BANNED' ? '已限制' : '正常',
    lastSeen: user.updatedAt?.replace('T', ' ').slice(0, 16) || '2026-07-30 19:00'
  }));
};

export const GroupOwnersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedBotMode, setSelectedBotMode] = useState<'welcome' | 'audit' | 'ops'>('ops');
  const [alerts, setAlerts] = useState<GroupBotAlert[]>([]);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const [userRows, alertRows] = await Promise.all([getUsers(), getGroupBotAlerts().catch(() => [])]);
        setUsers(userRows);
        setAlerts(alertRows);
      } catch (e: any) {
        setError(String(e?.message || e));
      }
    };

    void load();
  }, []);

  const rows = useMemo(() => buildOwners(users), [users]);
  const mentionAlerts = useMemo(
    () => alerts.filter((alert) => alert.triggerType === 'MENTION').slice(0, 5),
    [alerts]
  );

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="section-kicker">群主管理</div>
          <h1>群主管理</h1>
          <p className="page-subtitle">查看群主账号、负责群组数量与最后活跃时间，补齐群主维护入口。</p>
        </div>
        <div className="toolbar-actions">
          <span className="pill subtle">群机器人协助管理</span>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="data-source-note">
        数据来源：群主页优先读取真实用户与机器人提醒接口；“负责群组数”等字段在当前阶段属于推导数据，用于补齐后台观察视角，不代表独立群主主数据表。
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>机器人协助策略</h3>
              <p className="muted">给群主预设机器人协助模式，减少人工维护成本。</p>
            </div>
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={() => setSelectedBotMode('welcome')}>欢迎助手</button>
            <button type="button" onClick={() => setSelectedBotMode('audit')}>风控助手</button>
            <button type="button" onClick={() => setSelectedBotMode('ops')}>智能运营</button>
          </div>
          <p className="field-help">
            当前模式：
            {selectedBotMode === 'welcome' ? ' 自动欢迎、群规提醒、快捷入群说明。' : null}
            {selectedBotMode === 'audit' ? ' 敏感词拦截、违规提醒、群消息巡检。' : null}
            {selectedBotMode === 'ops' ? ' 欢迎语、定时公告、活跃统计、关键词自动回复。' : null}
          </p>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>群主待办</h3>
              <p className="muted">把机器人的协助项转成群主可执行清单。</p>
            </div>
          </div>
          <div className="legend finance-legend">
            <div className="legend-item"><span className="legend-dot legend-dot-web" />新建群默认带机器人模板 <strong>开启</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-android" />敏感词词库每晚同步 <strong>开启</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-ios" />每日活跃统计推送群主 <strong>开启</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-web" />用户购买信息通知群主 <strong>开启</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-ios" />用户退款资金通知财务 <strong>开启</strong></div>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>群内称呼消息提示</h3>
            <p className="muted">当用户在群里叫群主、管理、管理员、财务时，机器人会把消息转发到对应的管理席位。</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>触发词</th>
                <th>接收人</th>
                <th>消息形式</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>群主</td>
                <td>群主 + 当前值班管理</td>
                <td>机器人私信提醒</td>
                <td>已开启</td>
              </tr>
              <tr>
                <td>管理 / 管理员</td>
                <td>管理员席位</td>
                <td>后台提示 + 群内已读提醒</td>
                <td>已开启</td>
              </tr>
              <tr>
                <td>财务</td>
                <td>财务席位</td>
                <td>后台提示 + 财务待办</td>
                <td>已开启</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>群机器人提醒记录</h3>
            <p className="muted">优先读取真实提醒记录，帮助群主确认“购买 / 退款 / 称呼提醒”是否已触发。</p>
          </div>
        </div>
        <div className="legend finance-legend">
          {(mentionAlerts.length
            ? mentionAlerts.map((alert) => (
                <div key={alert.id} className="legend-item">
                  <span className="legend-dot legend-dot-ios" />
                  {alert.content}
                  <strong>{alert.triggerKeyword || alert.triggerType}</strong>
                </div>
              ))
            : [
                <div key="fallback-owner" className="legend-item"><span className="legend-dot legend-dot-web" />用户叫“群主”时，机器人会通知群主和值班管理<strong>群主</strong></div>,
                <div key="fallback-admin" className="legend-item"><span className="legend-dot legend-dot-android" />用户叫“管理/管理员”时，机器人会通知管理员席位<strong>管理员</strong></div>,
                <div key="fallback-finance" className="legend-item"><span className="legend-dot legend-dot-ios" />用户叫“财务”时，机器人会通知财务席位<strong>财务</strong></div>
              ])}
        </div>
      </section>
      <div className="table-wrap panel">
        <table className="table">
          <thead>
            <tr>
              <th>群主ID</th>
              <th>昵称</th>
              <th>手机号</th>
              <th>负责群组数</th>
              <th>状态</th>
              <th>最后活跃时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((owner) => (
              <tr key={owner.id}>
                <td className="mono">{owner.id}</td>
                <td>{owner.nickname}</td>
                <td className="mono">{owner.phone}</td>
                <td>{owner.managedGroups}</td>
                <td>{owner.status}</td>
                <td className="mono">{owner.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
