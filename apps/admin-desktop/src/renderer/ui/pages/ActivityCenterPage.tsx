import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createActivityCampaign,
  getActivityCampaigns,
  type ActivityCampaign
} from '../../api/admin';

const MODULE_DEFS: Array<{
  type: ActivityCampaign['activityType'];
  label: string;
  description: string;
  accent: string;
}> = [
  { type: 'DISCOUNT', label: '优惠活动', description: '配置满减、折扣和限时优惠的投放节奏。', accent: '优惠券 / 会员促销' },
  { type: 'CHECKIN', label: '签到活动', description: '查看连续签到奖励、补签规则和参与人数。', accent: '签到奖励 / 连续天数' },
  { type: 'LUCKY_DRAW', label: '大转盘活动', description: '管理奖池概率、转盘奖品和活动上线状态。', accent: '奖池配置 / 抽奖频次' },
  { type: 'INVITE', label: '邀请好友活动', description: '统计邀请裂变效果，配置邀请奖励与门槛。', accent: '邀请奖励 / 裂变增长' },
  { type: 'BANNER', label: '轮播图管理', description: '维护首页轮播图素材、跳转链接和排序。', accent: '素材排期 / 跳转位' },
  { type: 'RED_PACKET', label: '发红包', description: '查看红包金额、库存余量和投放时段。', accent: '红包池 / 发放时段' }
];

const formatDateTime = (value?: string | null) => {
  if (!value) return '未设置';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
};

const formatStatus = (status?: string | null) => {
  if (status === 'PUBLISHED') return '已发布';
  if (status === 'PAUSED') return '已暂停';
  if (status === 'DRAFT') return '草稿';
  return '未设置';
};

export const ActivityCenterPage = () => {
  const [campaigns, setCampaigns] = useState<ActivityCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<{
    activityType: ActivityCampaign['activityType'];
    title: string;
    content: string;
    coverUrl: string;
    status: ActivityCampaign['status'];
    startAt: string;
    endAt: string;
    configText: string;
  }>({
    activityType: 'DISCOUNT',
    title: '',
    content: '',
    coverUrl: '',
    status: 'DRAFT',
    startAt: '',
    endAt: '',
    configText: '{\n  "channel": "desktop-admin"\n}'
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getActivityCampaigns();
      setCampaigns(rows);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const published = campaigns.filter((item) => item.status === 'PUBLISHED').length;
    const draft = campaigns.filter((item) => item.status === 'DRAFT').length;
    const paused = campaigns.filter((item) => item.status === 'PAUSED').length;
    return { published, draft, paused };
  }, [campaigns]);

  const moduleCards = useMemo(
    () =>
      MODULE_DEFS.map((module) => {
        const items = campaigns.filter((item) => item.activityType === module.type);
        const latest = items[0];
        return {
          ...module,
          total: items.length,
          published: items.filter((item) => item.status === 'PUBLISHED').length,
          latest
        };
      }),
    [campaigns]
  );

  const updateDraft = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  };

  const submitActivity = async () => {
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title || !content) {
      setSubmitError('活动标题和内容不能为空。');
      setSubmitSuccess(null);
      return;
    }

    let config: Record<string, unknown> = {};
    try {
      config = draft.configText.trim() ? JSON.parse(draft.configText) : {};
    } catch {
      setSubmitError('活动配置 JSON 解析失败，请检查格式。');
      setSubmitSuccess(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const created = await createActivityCampaign({
        activityType: draft.activityType,
        title,
        content,
        coverUrl: draft.coverUrl.trim() || null,
        status: draft.status,
        startAt: draft.startAt ? new Date(draft.startAt).toISOString() : null,
        endAt: draft.endAt ? new Date(draft.endAt).toISOString() : null,
        config
      });
      setCampaigns((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSubmitSuccess(`提交活动成功：${created.title}（${formatStatus(created.status)}）。`);
      setDraft((current) => ({
        ...current,
        title: '',
        content: '',
        coverUrl: '',
        startAt: '',
        endAt: ''
      }));
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="section-kicker">活动中心</div>
          <h1>活动管理</h1>
          <p className="page-subtitle">统一承接优惠活动、签到活动、大转盘活动、邀请好友活动、轮播图管理和发红包模块。</p>
        </div>
        <div className="toolbar-actions">
          <span className="pill subtle">{loading ? '活动数据同步中...' : `已加载 ${campaigns.length} 条活动配置`}</span>
          <button type="button" onClick={() => void load()} disabled={loading}>
            重新拉取
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {submitError && <div className="error">{submitError}</div>}
      {submitSuccess && <div className="ok">{submitSuccess}</div>}

      <div className="data-source-note">
        数据来源：活动列表与活动创建都直连真实后台接口 `/api/admin/activity-campaigns`。当当前模块暂无活动时，列表会显示“待配置”占位行，便于运营确认缺口。
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">活动总数</span>
          <strong className="stat-value">{campaigns.length}</strong>
          <span className="stat-delta positive">覆盖 6 个运营模块</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">已发布</span>
          <strong className="stat-value">{metrics.published}</strong>
          <span className="stat-delta positive">可直接对外生效</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">草稿 / 待完善</span>
          <strong className="stat-value">{metrics.draft}</strong>
          <span className="stat-delta warning">待运营确认上线节奏</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">暂停中</span>
          <strong className="stat-value">{metrics.paused}</strong>
          <span className="stat-delta">保留历史配置与资源位</span>
        </article>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>提交活动</h3>
            <p className="muted">从桌面后台直接创建优惠、签到、转盘、邀请、轮播图和红包活动，提交成功后会立即回写到下方列表。</p>
          </div>
          <span className="pill">{draft.activityType}</span>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>活动类型</label>
            <select
              value={draft.activityType}
              onChange={(e) =>
                updateDraft('activityType', e.target.value as ActivityCampaign['activityType'])
              }
            >
              {MODULE_DEFS.map((module) => (
                <option key={module.type} value={module.type}>
                  {module.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>活动状态</label>
            <select
              value={draft.status}
              onChange={(e) => updateDraft('status', e.target.value as ActivityCampaign['status'])}
            >
              <option value="DRAFT">草稿</option>
              <option value="PUBLISHED">已发布</option>
              <option value="PAUSED">已暂停</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>活动标题</label>
          <input
            value={draft.title}
            onChange={(e) => updateDraft('title', e.target.value)}
            placeholder="例如：八月会员折扣周"
          />
        </div>

        <div className="field">
          <label>活动内容</label>
          <textarea
            rows={4}
            value={draft.content}
            onChange={(e) => updateDraft('content', e.target.value)}
            placeholder="请输入活动说明、规则和投放目标"
          />
        </div>

        <div className="field">
          <label>封面图 URL</label>
          <input
            value={draft.coverUrl}
            onChange={(e) => updateDraft('coverUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label>开始时间</label>
            <input
              type="datetime-local"
              value={draft.startAt}
              onChange={(e) => updateDraft('startAt', e.target.value)}
            />
          </div>
          <div className="field">
            <label>结束时间</label>
            <input
              type="datetime-local"
              value={draft.endAt}
              onChange={(e) => updateDraft('endAt', e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>配置 JSON</label>
          <textarea
            className="config-editor"
            rows={6}
            value={draft.configText}
            onChange={(e) => updateDraft('configText', e.target.value)}
            placeholder='{"channel":"desktop-admin"}'
          />
          <span className="field-help">需要合法 JSON。后台会原样写入 `config_json` 字段。</span>
        </div>

        <div className="actions-row">
          <button type="button" onClick={() => void submitActivity()} disabled={submitting}>
            {submitting ? '提交中...' : '提交活动'}
          </button>
        </div>
      </section>

      <div className="activity-grid">
        {moduleCards.map((module) => (
          <article key={module.type} className="activity-card panel">
            <div className="activity-card-header">
              <div>
                <div className="section-kicker">{module.accent}</div>
                <h3>{module.label}</h3>
              </div>
              <span className="pill">{module.total} 条配置</span>
            </div>

            <p className="muted">{module.description}</p>

            <div className="activity-card-metrics">
              <div className="activity-metric">
                <span className="meta-label">已发布</span>
                <strong>{module.published}</strong>
              </div>
              <div className="activity-metric">
                <span className="meta-label">最近一条</span>
                <strong>{module.latest?.title || '暂无活动'}</strong>
              </div>
            </div>

            <div className="activity-card-footer">
              <span className={`status-badge ${module.latest?.status === 'PUBLISHED' ? 'ok' : module.latest?.status === 'PAUSED' ? 'warning' : 'neutral'}`}>
                {formatStatus(module.latest?.status)}
              </span>
              <span className="field-help">更新时间：{formatDateTime(module.latest?.updatedAt || module.latest?.createdAt)}</span>
            </div>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>最近活动配置</h3>
            <p className="muted">按时间倒序展示最近录入的活动，便于快速核对活动状态和投放时间。</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>活动类型</th>
                <th>标题</th>
                <th>状态</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns.length ? campaigns : moduleCards.map((module) => ({
                id: module.type,
                activityType: module.type,
                title: `${module.label}模块待配置`,
                status: 'DRAFT' as const,
                startAt: null,
                endAt: null,
                updatedAt: '',
                createdAt: '',
                content: '',
                coverUrl: null,
                config: {},
                createdBy: ''
              }))).slice(0, 8).map((item) => (
                <tr key={item.id}>
                  <td>{MODULE_DEFS.find((module) => module.type === item.activityType)?.label || item.activityType}</td>
                  <td>{item.title}</td>
                  <td>
                    <span className={`status-badge ${item.status === 'PUBLISHED' ? 'ok' : item.status === 'PAUSED' ? 'warning' : 'neutral'}`}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                  <td className="mono">{formatDateTime(item.startAt)}</td>
                  <td className="mono">{formatDateTime(item.endAt)}</td>
                  <td className="mono">{formatDateTime(item.updatedAt || item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
