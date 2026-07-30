import React from 'react';
import { Link } from 'react-router-dom';
import { fetchEarningsSummary, type EarningsSummary } from '../api/profile';

export default function EarningsPage() {
  const [earnings, setEarnings] = React.useState<EarningsSummary | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetchEarningsSummary().then((nextEarnings) => {
      if (!cancelled) {
        setEarnings(nextEarnings);
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
          <h1>收益</h1>
          <p>支持按今日、本周、本月快速查看趋势。</p>
        </div>
        <Link className="mini-link" to="/h5/wallet">
          返回钱包
        </Link>
      </header>
      <div className="placeholder-list stats-grid">
        <article className="stat-card">
          <strong>{earnings?.today ?? '--'}</strong>
          <span>今日收益</span>
        </article>
        <article className="stat-card">
          <strong>{earnings?.thisWeek ?? '--'}</strong>
          <span>本周收益</span>
        </article>
        <article className="stat-card">
          <strong>{earnings?.thisMonth ?? '--'}</strong>
          <span>本月收益</span>
        </article>
      </div>
    </section>
  );
}
