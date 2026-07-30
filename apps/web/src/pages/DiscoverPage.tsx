import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadActivityFeed, type ActivityPreview } from '../api/profile';

const primaryRows = [
  { title: '朋友圈', to: '/h5/discover/moments', subtitle: '查看好友动态与互动提醒', icon: '圈' },
  { title: '扫一扫', to: '/h5/discover/scan', subtitle: '快速进入二维码与识别入口', icon: '扫' },
  { title: '看一看', to: '/h5/discover/channels', subtitle: '浏览推荐内容与热点更新', icon: '看' },
  { title: '搜一搜', to: '/h5/discover/search', subtitle: '搜索群聊、内容和服务', icon: '搜' }
] as const;

const serviceRows = [
  { title: '系统通知', to: '/h5/system-notice', subtitle: '查看后台公告、风控与处理结果', icon: '通' },
  { title: '钱包', to: '/h5/wallet', subtitle: '查看余额、待结算和账户状态', icon: '钱' },
  { title: '收益', to: '/h5/earnings', subtitle: '查看今日、本周、本月收益', icon: '益' },
  { title: '代理中心', to: '/h5/agent', subtitle: '查看代理等级与团队规模', icon: '代' }
] as const;

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

        <nav className="service-entry-stack discover-entry-stack" aria-label="发现常用入口">
          {primaryRows.map((row) => (
            <Link key={row.to} className="service-entry-link discover-entry-link" to={row.to}>
              <span className="service-entry-icon discover-entry-icon" aria-hidden="true">
                {row.icon}
              </span>
              <span className="service-entry-copy">
                <strong>{row.title}</strong>
                <span>{row.subtitle}</span>
              </span>
              <span className="service-entry-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>
          ))}
        </nav>

        <nav className="service-entry-stack discover-entry-stack" aria-label="发现服务入口">
          {serviceRows.map((row) => (
            <Link key={row.to} className="service-entry-link discover-entry-link" to={row.to}>
              <span className="service-entry-icon discover-entry-icon is-secondary" aria-hidden="true">
                {row.icon}
              </span>
              <span className="service-entry-copy">
                <strong>{row.title}</strong>
                <span>{row.subtitle}</span>
              </span>
              <span className="service-entry-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>
          ))}
        </nav>

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
