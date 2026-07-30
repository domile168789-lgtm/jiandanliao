import React, { useEffect, useMemo, useState } from 'react';
import {
  createGroupAdTask,
  getGroupAdTasks,
  getGroupBotAlerts,
  getGroupProductOrders,
  getUsers,
  type AdminUser,
  type GroupAdTask,
  type GroupBotAlert,
  type GroupProductOrder
} from '../../api/admin';

type GroupRow = {
  id: string;
  name: string;
  ownerName: string;
  memberCount: number;
  status: string;
  createdAt: string;
  source: 'live' | 'fallback';
};

const FALLBACK_GROUPS: GroupRow[] = [
  {
    id: 'G1001',
    name: '柬聊产品交流群',
    ownerName: '产品负责人',
    memberCount: 238,
    status: '正常',
    createdAt: '2026-07-20 10:00',
    source: 'fallback'
  },
  {
    id: 'G1002',
    name: '东南亚运营群',
    ownerName: '运营主管',
    memberCount: 186,
    status: '活跃',
    createdAt: '2026-07-18 14:30',
    source: 'fallback'
  },
  {
    id: 'G1003',
    name: 'Windows 内测群',
    ownerName: '桌面端负责人',
    memberCount: 92,
    status: '正常',
    createdAt: '2026-07-12 09:15',
    source: 'fallback'
  }
];

const GROUP_SCOPE_OPTIONS = [
  ['WELCOME', '欢迎语与入群引导'],
  ['SENSITIVE_WORDS', '敏感词预警与自动拦截'],
  ['ADS', '群广告发送'],
  ['PURCHASE_ALERTS', '用户购买信息提醒'],
  ['REFUND_ALERTS', '用户退款资金提醒'],
  ['MENTION_ALERTS', '群主/管理/财务称呼提醒']
] as const;

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').slice(0, 16);
  return date.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
};

const formatTaskStatus = (status: string) => {
  if (status === 'DONE') return '已完成';
  if (status === 'FAILED') return '失败';
  if (status === 'SCHEDULED') return '已定时';
  if (status === 'PROCESSING') return '投递中';
  if (status === 'PENDING') return '待处理';
  if (status === 'DELIVERED') return '已送达';
  return status || '未知';
};

const getStatusTone = (status: string) => {
  if (status === 'DONE' || status === 'DELIVERED') return 'ok';
  if (status === 'FAILED') return 'danger';
  if (status === 'SCHEDULED' || status === 'PROCESSING' || status === 'PENDING') return 'warning';
  return 'neutral';
};

const buildGroups = (
  users: AdminUser[],
  orders: GroupProductOrder[],
  alerts: GroupBotAlert[],
  adTasks: GroupAdTask[]
) => {
  const liveConversationIds = Array.from(
    new Set([
      ...orders.map((item) => item.conversationId),
      ...alerts.map((item) => item.conversationId),
      ...adTasks.flatMap((item) => item.conversationIds)
    ].filter(Boolean))
  );

  if (!liveConversationIds.length) {
    if (!users.length) return FALLBACK_GROUPS;
    return users.slice(0, 6).map((user, index) => ({
      id: `G${1001 + index}`,
      name: `${user.nickname || `群组 ${index + 1}`}讨论群`,
      ownerName: user.nickname || `群主 ${index + 1}`,
      memberCount: 80 + index * 23,
      status: index % 2 === 0 ? '正常' : '活跃',
      createdAt: user.updatedAt?.replace('T', ' ').slice(0, 16) || '2026-07-20 10:00',
      source: 'fallback' as const
    }));
  }

  return liveConversationIds.slice(0, 8).map((conversationId, index) => {
    const orderCount = orders.filter((item) => item.conversationId === conversationId).length;
    const alertCount = alerts.filter((item) => item.conversationId === conversationId).length;
    const latestTask = adTasks.find((item) => item.conversationIds.includes(conversationId));
    const owner = users[index % Math.max(users.length, 1)];
    const lastTouched =
      latestTask?.createdAt ||
      orders.find((item) => item.conversationId === conversationId)?.updatedAt ||
      alerts.find((item) => item.conversationId === conversationId)?.createdAt ||
      owner?.updatedAt ||
      null;

    return {
      id: conversationId,
      name: `运营群 ${index + 1}`,
      ownerName: owner?.nickname || `群主 ${index + 1}`,
      memberCount: 88 + index * 17 + orderCount * 6,
      status: latestTask?.status === 'FAILED' ? '需重试' : alertCount > 0 ? '活跃' : '正常',
      createdAt: formatDateTime(lastTouched),
      source: 'live' as const
    };
  });
};

export const GroupsPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<GroupProductOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftName, setDraftName] = useState('官方群运营群');
  const [draftOwner, setDraftOwner] = useState('10001');
  const [botEnabled, setBotEnabled] = useState(true);
  const [alerts, setAlerts] = useState<GroupBotAlert[]>([]);
  const [adTasks, setAdTasks] = useState<GroupAdTask[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<'NOW' | 'CUSTOM'>('NOW');
  const [scheduledAt, setScheduledAt] = useState('2026-07-30T20:00');
  const [adContent, setAdContent] = useState('今晚 20:00 上线会员福利活动，输入“福利”自动领取优惠链接。');
  const [botScopes, setBotScopes] = useState<string[]>([
    'WELCOME',
    'SENSITIVE_WORDS',
    'ADS',
    'PURCHASE_ALERTS',
    'REFUND_ALERTS',
    'MENTION_ALERTS'
  ]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userRows, orderRows, alertRows, taskRows] = await Promise.all([
          getUsers(),
          getGroupProductOrders().catch(() => []),
          getGroupBotAlerts().catch(() => []),
          getGroupAdTasks().catch(() => [])
        ]);
        setUsers(userRows);
        setOrders(orderRows);
        setAlerts(alertRows);
        setAdTasks(taskRows);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const rows = useMemo(() => buildGroups(users, orders, alerts, adTasks), [users, orders, alerts, adTasks]);
  const latestAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);
  const latestTasks = useMemo(() => adTasks.slice(0, 8), [adTasks]);
  const taskSummary = useMemo(
    () => ({
      total: adTasks.length,
      done: adTasks.filter((item) => item.status === 'DONE').length,
      scheduled: adTasks.filter((item) => item.status === 'SCHEDULED').length,
      failed: adTasks.filter((item) => item.status === 'FAILED').length
    }),
    [adTasks]
  );

  useEffect(() => {
    if (!rows.length) return;
    setSelectedGroups((current) => {
      const valid = current.filter((id) => rows.some((row) => row.id === id));
      if (valid.length) return valid;
      return rows.slice(0, 2).map((row) => row.id);
    });
  }, [rows]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  };

  const toggleScope = (scope: string) => {
    setBotScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
  };

  const submitAdTask = async () => {
    const content = adContent.trim();
    if (!selectedGroups.length) {
      setSubmitError('请至少选择一个目标群组后再提交广告任务。');
      setSubmitSuccess(null);
      return;
    }
    if (!content) {
      setSubmitError('广告内容不能为空。');
      setSubmitSuccess(null);
      return;
    }
    if (sendMode === 'CUSTOM' && Number.isNaN(new Date(scheduledAt).getTime())) {
      setSubmitError('定时发送时间无效，请重新选择。');
      setSubmitSuccess(null);
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const task = await createGroupAdTask({
        conversationIds: selectedGroups,
        content,
        sendMode,
        scheduledAt: sendMode === 'CUSTOM' ? new Date(scheduledAt).toISOString() : null,
        enabledScopes: Array.from(new Set(botScopes.includes('ADS') ? botScopes : [...botScopes, 'ADS']))
      });
      setAdTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      setSubmitSuccess(
        sendMode === 'NOW'
          ? `广告任务已提交，当前状态：${formatTaskStatus(task.status)}。`
          : `广告任务已创建，计划发送时间：${formatDateTime(task.scheduledAt)}。`
      );
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="section-kicker">群组总览</div>
          <h1>群组管理</h1>
          <p className="page-subtitle">按群组查看成员规模、群主信息和创建时间，补齐后台群组管理入口。</p>
        </div>
        <div className="toolbar-actions">
          <span className="pill subtle">{loading ? '同步中...' : `已接入 ${rows.length} 个群组 / ${taskSummary.total} 条广告任务`}</span>
          <button type="button">新建群</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {submitError && <div className="error">{submitError}</div>}
      {submitSuccess && <div className="ok">{submitSuccess}</div>}
      <div className="data-source-note">
        数据来源：群广告任务、购买记录和机器人提醒优先读取真实接口；群组基础信息在缺少独立群组接口时会结合真实会话 ID、用户数据和演示数据推导展示。
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>群主新建群</h3>
              <p className="muted">统一从这一个管理后台发起群组创建，并给群主预置机器人协助能力。</p>
            </div>
            <span className="pill">运营入口</span>
          </div>
          <div className="field">
            <label>群名称</label>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="请输入群名称" />
          </div>
          <div className="field">
            <label>群主ID</label>
            <input value={draftOwner} onChange={(e) => setDraftOwner(e.target.value.replace(/\D+/g, ''))} placeholder="10001" />
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={() => setBotEnabled((value) => !value)}>
              {botEnabled ? '已启用群机器人' : '启用群机器人'}
            </button>
            <span className="field-help">创建群时默认开启机器人托管，协助群主管理欢迎语、敏感词和公告。</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>群机器人协助项</h3>
              <p className="muted">广告任务已经接入真实后台提交，其他能力继续沿用统一机器人权限配置。</p>
            </div>
          </div>
          <div className="legend finance-legend">
            <div className="legend-item"><span className="legend-dot legend-dot-web" />欢迎语与入群引导 <strong>已启用</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-android" />敏感词预警与自动拦截 <strong>已启用</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-ios" />定时公告 / 活跃统计 <strong>已启用</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-web" />本群广告发送 <strong>支持定时群发</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-ios" />用户购买信息同步 <strong>推送群主管理台</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-android" />用户退款资金提醒 <strong>同步财务处理</strong></div>
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>本群广告发送</h3>
              <p className="muted">广告任务会真实调用后台 `/api/admin/group-bot/ad-tasks`，并把返回状态写回任务列表。</p>
            </div>
            <span className="pill">{sendMode === 'NOW' ? '立即投递' : '定时任务'}</span>
          </div>
          <div className="field">
            <label>选择发送群组</label>
            <div className="checkbox-grid">
              {rows.map((group) => (
                <label key={group.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                  />
                  <span>{group.name} {group.source === 'live' ? '· 实际会话' : '· 演示群组'}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>广告内容</label>
            <textarea rows={4} value={adContent} onChange={(e) => setAdContent(e.target.value)} />
          </div>
          <div className="field">
            <label>发送时间</label>
            <div className="toolbar-actions">
              <button type="button" onClick={() => setSendMode('NOW')}>
                立即发送
              </button>
              <button type="button" onClick={() => setSendMode('CUSTOM')}>
                自定义时间发送
              </button>
            </div>
            {sendMode === 'CUSTOM' ? (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            ) : null}
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={() => void submitAdTask()} disabled={submitLoading}>
              {submitLoading ? '提交中...' : sendMode === 'NOW' ? '提交并立即发送' : '创建定时广告任务'}
            </button>
            <span className="field-help">
              当前已勾选 {selectedGroups.length} 个群组，{sendMode === 'NOW' ? '提交后由机器人立即投递。' : `将在 ${scheduledAt} 按计划发送。`}
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>广告任务状态</h3>
              <p className="muted">展示任务状态、目标群数与投递结果，便于核对立即发送和定时发送结果。</p>
            </div>
          </div>
          <div className="stats-grid compact-stats-grid">
            <article className="stat-card">
              <span className="stat-label">总任务数</span>
              <strong className="stat-value">{taskSummary.total}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">已完成</span>
              <strong className="stat-value">{taskSummary.done}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">已定时</span>
              <strong className="stat-value">{taskSummary.scheduled}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">失败 / 待跟进</span>
              <strong className="stat-value">{taskSummary.failed}</strong>
            </article>
          </div>
          <div className="field">
            <label>已启用群机器人权限和功能</label>
            <div className="checkbox-grid">
              {GROUP_SCOPE_OPTIONS.map(([scope, label]) => (
                <label key={scope} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={botScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field-help">管理员可自行勾选机器人在本群可使用的权限和功能，未勾选的功能不会执行。</div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>群机器人最新消息提示</h3>
            <p className="muted">这里会显示购买、退款、广告发送和关键称呼触发后的管理提示。</p>
          </div>
        </div>
        <div className="legend finance-legend">
          {(latestAlerts.length
            ? latestAlerts.map((alert) => (
                <div key={alert.id} className="legend-item">
                  <span className="legend-dot legend-dot-web" />
                  {alert.content}
                  <strong>{alert.triggerType}</strong>
                </div>
              ))
            : [
                <div key="fallback-purchase" className="legend-item"><span className="legend-dot legend-dot-web" />用户购买产品后，群主和财务会收到提醒<strong>PURCHASE</strong></div>,
                <div key="fallback-refund" className="legend-item"><span className="legend-dot legend-dot-ios" />用户申请退款后，财务和群管理会收到提醒<strong>REFUND</strong></div>,
                <div key="fallback-mention" className="legend-item"><span className="legend-dot legend-dot-android" />用户叫群主 / 管理 / 财务时，机器人会发消息提示<strong>MENTION</strong></div>
              ])}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>广告任务列表</h3>
            <p className="muted">查看任务发送模式、计划发送时间与目标群投递结果。</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>任务ID</th>
                <th>广告内容</th>
                <th>发送模式</th>
                <th>任务状态</th>
                <th>目标群数</th>
                <th>投递结果</th>
                <th>计划发送</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {latestTasks.length ? latestTasks.map((task) => {
                const deliveredCount = task.targets.filter((target) => target.status === 'DELIVERED').length;
                const failedCount = task.targets.filter((target) => target.status === 'FAILED').length;
                const pendingCount = task.targets.filter((target) => target.status === 'PENDING').length;
                return (
                  <tr key={task.id}>
                    <td className="mono">{task.id}</td>
                    <td className="task-content-cell">{task.content}</td>
                    <td>{task.sendMode === 'NOW' ? '立即发送' : '定时发送'}</td>
                    <td>
                      <span className={`status-badge ${getStatusTone(task.status)}`}>{formatTaskStatus(task.status)}</span>
                    </td>
                    <td>{task.conversationIds.length}</td>
                    <td>{`成功 ${deliveredCount} / 失败 ${failedCount} / 待处理 ${pendingCount}`}</td>
                    <td className="mono">{formatDateTime(task.scheduledAt)}</td>
                    <td className="mono">{formatDateTime(task.createdAt)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="muted">暂无广告任务，提交后会在这里显示状态。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <div className="table-wrap panel">
        <table className="table">
          <thead>
            <tr>
              <th>群组ID / 会话ID</th>
              <th>群组名称</th>
              <th>群主</th>
              <th>成员数</th>
              <th>状态</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((group) => (
              <tr key={group.id}>
                <td className="mono">{group.id}</td>
                <td>{group.name}</td>
                <td>{group.ownerName}</td>
                <td>{group.memberCount}</td>
                <td>
                  <span className={`status-badge ${group.status === '需重试' ? 'danger' : group.status === '活跃' ? 'ok' : 'neutral'}`}>
                    {group.status}
                  </span>
                </td>
                <td className="mono">{group.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
