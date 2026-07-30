import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadSystemNotices, type SystemNotice } from '../api/profile';

export default function SystemNoticePage() {
  const [rows, setRows] = React.useState<SystemNotice[]>([]);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void loadSystemNotices()
      .then((result) => {
        if (!cancelled) {
          setRows(result.data);
          setNoticeMessage(result.notice || null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRows([]);
          setErrorMessage(getErrorMessage(error, '系统通知加载失败，请稍后重试'));
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
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
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
