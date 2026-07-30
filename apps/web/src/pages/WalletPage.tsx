import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadWalletSummary, type WalletSummary } from '../api/profile';

export default function WalletPage() {
  const [wallet, setWallet] = React.useState<WalletSummary | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void loadWalletSummary()
      .then((result) => {
        if (!cancelled) {
          setWallet(result.data);
          setNoticeMessage(result.notice || null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setWallet(null);
          setErrorMessage(getErrorMessage(error, '钱包加载失败，请稍后重试'));
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
          <h1>钱包</h1>
          <p>余额、待结算收入与账户更新时间一页查看。</p>
        </div>
        <Link className="mini-link" to="/h5/earnings">
          查看收益
        </Link>
      </header>
      <div className="placeholder-list">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        <section className="stats-grid">
          <article className="stat-card">
            <strong>{wallet ? `${wallet.currency} ${wallet.balance.toFixed(2)}` : '--'}</strong>
            <span>当前余额</span>
          </article>
          <article className="stat-card">
            <strong>{wallet ? `${wallet.currency} ${wallet.pendingIncome.toFixed(2)}` : '--'}</strong>
            <span>待结算</span>
          </article>
        </section>
        <section className="section-card">
          <h2>账户信息</h2>
          <p>最后更新时间：{wallet ? new Date(wallet.updatedAt).toLocaleString('zh-CN') : '--'}</p>
        </section>
      </div>
    </section>
  );
}
