import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadProfileOverview, type ProfileOverview } from '../api/profile';

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<ProfileOverview | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void loadProfileOverview()
      .then((result) => {
        if (!cancelled) {
          setProfile(result.data);
          setNoticeMessage(result.notice || null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setProfile(null);
          setErrorMessage(getErrorMessage(error, '个人资料加载失败，请稍后重试'));
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
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
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
