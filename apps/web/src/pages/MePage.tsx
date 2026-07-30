import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import {
  loadAgentOverview,
  loadProfileOverview,
  loadWalletSummary,
  type AgentOverview,
  type ProfileOverview,
  type WalletSummary
} from '../api/profile';

const mePrimaryRows = [
  { title: '服务', to: '/h5/me/services', icon: '服' },
  { title: '收藏', to: '/h5/me/favorites', icon: '藏' },
  { title: '朋友圈', to: '/h5/discover/moments', icon: '圈' }
] as const;

const meSecondaryRows = [
  { title: '卡包', to: '/h5/me/cards', icon: '卡' },
  { title: '表情', to: '/h5/me/stickers', icon: '表' }
] as const;

const meSystemRows = [
  { title: '个人资料', to: '/h5/profile', icon: '我' },
  { title: '安全中心', to: '/h5/security', icon: '安' },
  { title: '设置', to: '/h5/settings', icon: '设' }
] as const;

export default function MePage() {
  const [profile, setProfile] = React.useState<ProfileOverview | null>(null);
  const [wallet, setWallet] = React.useState<WalletSummary | null>(null);
  const [agent, setAgent] = React.useState<AgentOverview | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const profileAvatar = (profile?.displayName || '我').trim().slice(0, 1);
  const accountDigits = (profile?.phone || '').replace(/\D/g, '');
  const accountLabel = accountDigits ? `柬单聊号 ${accountDigits.slice(-6)}` : '柬单聊号 --';
  const serviceSummary = wallet
    ? `${wallet.currency} ${wallet.balance.toFixed(2)}`
    : '钱包、收益、代理等入口';
  const serviceMeta = agent ? `${serviceSummary} · ${agent.level}` : serviceSummary;

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([loadProfileOverview(), loadWalletSummary(), loadAgentOverview()])
      .then(([profileResult, walletResult, agentResult]) => {
        if (cancelled) return;
        setProfile(profileResult.data);
        setWallet(walletResult.data);
        setAgent(agentResult.data);
        setErrorMessage(null);
        setNoticeMessage(
          profileResult.notice || walletResult.notice || agentResult.notice || null
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setProfile(null);
        setWallet(null);
        setAgent(null);
        setErrorMessage(getErrorMessage(error, '我的页面加载失败，请稍后重试'));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="h5-page">
      <header className="top-bar">
        <h1>我的</h1>
      </header>
      <div className="placeholder-list me-page">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        <Link className="me-profile-card" to="/h5/profile">
          <span className="me-profile-avatar" aria-hidden="true">
            {profileAvatar || '我'}
          </span>
          <span className="me-profile-copy">
            <strong>{profile?.displayName || '加载中...'}</strong>
            <span>{profile?.phone || '请稍候'}</span>
            <span className="me-profile-meta">
              {accountLabel} · 安全等级 {profile?.safetyLevel || '--'}
            </span>
          </span>
          <span className="service-entry-arrow me-profile-arrow" aria-hidden="true">
            &gt;
          </span>
        </Link>

        <nav className="service-entry-stack me-entry-stack" aria-label="我的常用服务">
          {mePrimaryRows.map((row) => (
            <Link key={row.to} className="service-entry-link me-entry-link" to={row.to}>
              <span className="service-entry-icon me-entry-icon" aria-hidden="true">
                {row.icon}
              </span>
              <span className="service-entry-copy">
                <strong>{row.title}</strong>
                <span>{row.title === '服务' ? serviceMeta : `进入${row.title}入口`}</span>
              </span>
              <span className="service-entry-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>
          ))}
        </nav>

        <nav className="service-entry-stack me-entry-stack" aria-label="我的扩展入口">
          {meSecondaryRows.map((row) => (
            <Link key={row.to} className="service-entry-link me-entry-link" to={row.to}>
              <span className="service-entry-icon me-entry-icon is-accent" aria-hidden="true">
                {row.icon}
              </span>
              <span className="service-entry-copy">
                <strong>{row.title}</strong>
                <span>{`查看${row.title}内容与入口`}</span>
              </span>
              <span className="service-entry-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>
          ))}
        </nav>

        <nav className="service-entry-stack me-entry-stack" aria-label="我的系统入口">
          {meSystemRows.map((row) => (
            <Link key={row.to} className="service-entry-link me-entry-link" to={row.to}>
              <span className="service-entry-icon me-entry-icon is-neutral" aria-hidden="true">
                {row.icon}
              </span>
              <span className="service-entry-copy">
                <strong>{row.title}</strong>
                <span>{row.title === '个人资料' ? `查看 ${accountLabel}` : `进入${row.title}`}</span>
              </span>
              <span className="service-entry-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
