import React from 'react';
import { Link } from 'react-router-dom';
import { fetchProfileOverview, type ProfileOverview } from '../api/profile';

export default function ProfilePage() {
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
          <h1>个人资料</h1>
          <p>查看展示昵称、账号与入驻时间。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list list-stack">
        <article className="list-row">
          <div>
            <strong>展示昵称</strong>
            <span>{profile?.displayName || '--'}</span>
          </div>
        </article>
        <article className="list-row">
          <div>
            <strong>账号</strong>
            <span>{profile?.phone || '--'}</span>
          </div>
        </article>
        <article className="list-row">
          <div>
            <strong>注册时间</strong>
            <span>{profile?.memberSince || '--'}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
