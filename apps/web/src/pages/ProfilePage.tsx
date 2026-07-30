import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadProfileOverview, type ProfileOverview, updateProfileOverview } from '../api/profile';

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<ProfileOverview | null>(null);
  const [draftName, setDraftName] = React.useState('');
  const [draftAvatarUrl, setDraftAvatarUrl] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void loadProfileOverview()
      .then((result) => {
        if (!cancelled) {
          setProfile(result.data);
          setDraftName(result.data.displayName);
          setDraftAvatarUrl(result.data.avatarUrl || '');
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

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const nextProfile = await updateProfileOverview({
        displayName: draftName,
        avatarUrl: draftAvatarUrl
      });
      setProfile(nextProfile);
      setDraftName(nextProfile.displayName);
      setDraftAvatarUrl(nextProfile.avatarUrl || '');
      setSuccessMessage('资料已保存');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '资料保存失败，请稍后重试'));
    } finally {
      setSaving(false);
    }
  };

  const avatarLabel = (draftName || profile?.displayName || '我').trim().slice(0, 1) || '我';

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>个人资料</h1>
          <p>查看并编辑昵称、头像入口与账号信息。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list list-stack">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        {successMessage ? <div className="success-banner">{successMessage}</div> : null}
        <section className="section-card profile-hero">
          <strong>{profile?.displayName || '加载中...'}</strong>
          <span>{profile?.phone || '--'}</span>
          <span>{`安全等级 ${profile?.safetyLevel || '--'} · 入驻于 ${profile?.memberSince || '--'}`}</span>
          <span>{`头像占位：${avatarLabel}`}</span>
        </section>
        <form className="list-stack" onSubmit={handleSave}>
          <label className="search-box" htmlFor="profile-display-name">
            <span>昵称</span>
            <input
              id="profile-display-name"
              name="profile-display-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="请输入昵称"
            />
          </label>
          <label className="search-box" htmlFor="profile-avatar-url">
            <span>头像地址</span>
            <input
              id="profile-avatar-url"
              name="profile-avatar-url"
              value={draftAvatarUrl}
              onChange={(event) => setDraftAvatarUrl(event.target.value)}
              placeholder="可选：输入头像图片地址"
            />
          </label>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? '保存中...' : '保存资料'}
          </button>
        </form>
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
        <article className="list-row">
          <div>
            <strong>头像地址</strong>
            <span>{profile?.avatarUrl || '当前使用默认头像'}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
