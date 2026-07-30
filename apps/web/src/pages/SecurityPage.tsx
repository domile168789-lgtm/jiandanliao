import React from 'react';
import { Link } from 'react-router-dom';
import { fetchProfileOverview, type ProfileOverview } from '../api/profile';

const checks = ['设备登录保护', '密码更新提醒', '异常行为通知'];

export default function SecurityPage() {
  const [profile, setProfile] = React.useState<ProfileOverview | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetchProfileOverview().then((nextProfile) => {
      if (!cancelled) {
        setProfile(nextProfile);
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
          <h1>安全中心</h1>
          <p>查看账号安全状态并完成必要检查。</p>
        </div>
        <Link className="mini-link" to="/h5/settings">
          返回设置
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <h2>当前安全等级</h2>
          <p>{profile?.safetyLevel || '--'}</p>
        </section>
        <section className="list-stack">
          {checks.map((item) => (
            <article key={item} className="list-row">
              <div>
                <strong>{item}</strong>
                <span>已纳入当前 H5 演示流程</span>
              </div>
              <em>已开启</em>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
