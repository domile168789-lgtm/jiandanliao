import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadAgentOverview, type AgentOverview } from '../api/profile';

export default function AgentPage() {
  const [agent, setAgent] = React.useState<AgentOverview | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void loadAgentOverview()
      .then((result) => {
        if (!cancelled) {
          setAgent(result.data);
          setNoticeMessage(result.notice || null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAgent(null);
          setErrorMessage(getErrorMessage(error, '代理中心加载失败，请稍后重试'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>代理中心</h1>
          <p>代理等级、团队规模与佣金比例实时概览。</p>
        </div>
        <Link className="mini-link" to="/h5/discover">
          返回发现
        </Link>
      </header>
      <div className="placeholder-list stats-grid">
        {errorMessage ? <div className="form-error stats-grid-full">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        <article className="stat-card">
          <strong>{agent?.level || '--'}</strong>
          <span>当前等级</span>
        </article>
        <article className="stat-card">
          <strong>{agent?.teamCount ?? '--'}</strong>
          <span>团队规模</span>
        </article>
        <article className="stat-card">
          <strong>{agent?.commissionRate || '--'}</strong>
          <span>佣金比例</span>
        </article>
        <article className="stat-card">
          <strong>{agent?.status || '--'}</strong>
          <span>当前状态</span>
        </article>
      </div>
    </section>
  );
}
