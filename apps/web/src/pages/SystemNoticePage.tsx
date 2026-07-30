import React from 'react';
import { Link } from 'react-router-dom';
import { fetchSystemNotices, type SystemNotice } from '../api/profile';

export default function SystemNoticePage() {
  const [rows, setRows] = React.useState<SystemNotice[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void fetchSystemNotices().then((nextRows) => {
      if (!cancelled) {
        setRows(nextRows);
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
          <h1>系统通知</h1>
          <p>公告、风控结果和重要提醒会统一汇总在这里。</p>
        </div>
        <Link className="mini-link" to="/h5/messages">
          回到消息
        </Link>
      </header>
      <div className="placeholder-list list-stack">
        {rows.map((row) => (
          <article key={row.id} className="list-row notice-row">
            <div>
              <strong>{row.title}</strong>
              <span>{row.summary}</span>
            </div>
            <em>{row.status}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
