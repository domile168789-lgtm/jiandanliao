import React from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAgentOverview,
  fetchProfileOverview,
  fetchWalletSummary,
  type AgentOverview,
  type ProfileOverview,
  type WalletSummary
} from '../api/profile';

export default function MePage() {
  const [profile, setProfile] = React.useState<ProfileOverview | null>(null);
  const [wallet, setWallet] = React.useState<WalletSummary | null>(null);
  const [agent, setAgent] = React.useState<AgentOverview | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchProfileOverview(), fetchWalletSummary(), fetchAgentOverview()]).then(
      ([nextProfile, nextWallet, nextAgent]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setWallet(nextWallet);
        setAgent(nextAgent);
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="h5-page">
      <header className="top-bar">
        <h1>我的</h1>
      </header>
      <div className="placeholder-list">
        <section className="section-card profile-hero">
          <strong>{profile?.displayName || '加载中...'}</strong>
          <span>{profile?.phone || '请稍候'}</span>
          <span>安全等级：{profile?.safetyLevel || '--'}</span>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <strong>{wallet ? `${wallet.currency} ${wallet.balance.toFixed(2)}` : '--'}</strong>
            <span>钱包余额</span>
          </article>
          <article className="stat-card">
            <strong>{agent?.teamCount ?? '--'}</strong>
            <span>团队人数</span>
          </article>
        </section>

        <section className="list-stack">
          <Link className="list-link" to="/h5/profile">
            个人资料
          </Link>
          <Link className="list-link" to="/h5/security">
            安全中心
          </Link>
          <Link className="list-link" to="/h5/settings">
            设置
          </Link>
        </section>
      </div>
    </section>
  );
}
