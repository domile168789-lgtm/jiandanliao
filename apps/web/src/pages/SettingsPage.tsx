import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadProfileOverview, type ProfileOverview } from '../api/profile';
import {
  loadPrivacySettings,
  loadSecurityBlacklist,
  loadSecurityDevices,
  type SecurityBlacklistRow,
  type SecurityDeviceRow,
  type SecurityPrivacySettings
} from '../api/security';
import { clearAccessToken, setPreviewSessionEnabled } from '../state/session';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<ProfileOverview | null>(null);
  const [devices, setDevices] = React.useState<SecurityDeviceRow[]>([]);
  const [blacklist, setBlacklist] = React.useState<SecurityBlacklistRow[]>([]);
  const [privacy, setPrivacy] = React.useState<SecurityPrivacySettings | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([loadProfileOverview(), loadSecurityDevices(), loadSecurityBlacklist(), loadPrivacySettings()])
      .then(([profileResult, devicesResult, blacklistResult, privacyResult]) => {
        if (cancelled) return;
        setProfile(profileResult.data);
        setDevices(devicesResult.data);
        setBlacklist(blacklistResult.data);
        setPrivacy(privacyResult.data);
        setNoticeMessage(
          profileResult.notice || devicesResult.notice || blacklistResult.notice || privacyResult.notice || null
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error, '设置页加载失败，请稍后重试'));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const privacySummary = privacy?.discoverableByPhone ? '允许手机号搜索' : '隐藏手机号搜索';

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>设置</h1>
          <p>账号、语言与安全策略统一在这里管理。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        <section className="list-stack">
          <article className="list-row">
            <div>
              <strong>账号概览</strong>
              <span>{`${profile?.displayName || '--'} · ${profile?.phone || '--'}`}</span>
            </div>
          </article>
          <article className="list-row">
            <div>
              <strong>设备与黑名单</strong>
              <span>{`已登录设备 ${devices.length} 台 · 黑名单 ${blacklist.length} 人`}</span>
            </div>
          </article>
          <article className="list-row">
            <div>
              <strong>隐私偏好</strong>
              <span>{privacySummary}</span>
            </div>
          </article>
        </section>
        <section className="list-stack">
          <Link className="list-link" to="/h5/profile">
            编辑个人资料
          </Link>
          <Link className="list-link" to="/h5/security">
            管理安全设置
          </Link>
          <Link className="list-link" to="/h5/system-notice">
            查看系统通知
          </Link>
        </section>
        <button
          className="text-button settings-action"
          type="button"
          onClick={() => {
            clearAccessToken();
            setPreviewSessionEnabled(false);
            navigate('/h5/login');
          }}
        >
          退出登录
        </button>
      </div>
    </section>
  );
}
