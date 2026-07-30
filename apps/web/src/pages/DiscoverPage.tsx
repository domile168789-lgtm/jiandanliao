import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadActivityFeed, type ActivityPreview } from '../api/profile';

const discoverLinks = [
  { title: '系统通知', to: '/h5/system-notice', description: '查看后台公告、风控与处理结果。' },
  { title: '钱包', to: '/h5/wallet', description: '查看余额、待结算和账户状态。' },
  { title: '收益', to: '/h5/earnings', description: '查看今日、本周、本月收益。' },
  { title: '代理中心', to: '/h5/agent', description: '查看代理等级与团队规模。' }
];

export default function DiscoverPage() {
  const [activities, setActivities] = React.useState<ActivityPreview[]>([]);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void loadActivityFeed()
      .then((result) => {
        if (!cancelled) {
          setActivities(result.data);
          setNoticeMessage(result.notice || null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setActivities([]);
          setErrorMessage(getErrorMessage(error, '活动加载失败，请稍后重试'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="h5-page">
      <header className="top-bar">
        <h1>发现</h1>
      </header>
      <div className="placeholder-list discover-page">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        <section className="shortcut-grid">
          {discoverLinks.map((link) => (
            <Link key={link.to} className="shortcut-card" to={link.to}>
              <strong>{link.title}</strong>
              <span>{link.description}</span>
            </Link>
          ))}
        </section>

        <section className="section-card">
          <h2>活动中心</h2>
          <div className="list-stack">
            {activities.map((activity) => (
              <article key={activity.id} className="list-row">
                <div>
                  <strong>{activity.title}</strong>
                  <span>{activity.description}</span>
                </div>
                <em>{activity.status}</em>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
