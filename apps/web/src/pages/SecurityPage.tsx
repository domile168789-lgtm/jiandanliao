import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { loadProfileOverview, type ProfileOverview } from '../api/profile';
import {
  loadPrivacySettings,
  loadSecurityBlacklist,
  loadSecurityDevices,
  removeBlacklistContact,
  updatePrivacySettings,
  type SecurityBlacklistRow,
  type SecurityDeviceRow,
  type SecurityPrivacySettings
} from '../api/security';

const privacyRows: Array<{
  key: keyof SecurityPrivacySettings;
  title: string;
  description: string;
}> = [
  {
    key: 'discoverableByPhone',
    title: '允许通过手机号找到我',
    description: '关闭后，其他用户无法通过手机号在搜一搜中找到你。'
  },
  {
    key: 'requireFriendRequestNote',
    title: '添加好友需要附言',
    description: '开启后，新的朋友入口会优先校验附言说明。'
  },
  {
    key: 'allowGroupInvite',
    title: '允许群聊邀请',
    description: '关闭后，新群邀请需要你手动确认。'
  },
  {
    key: 'showReadReceipts',
    title: '展示已读状态',
    description: '控制消息页是否对外展示已读回执。'
  }
];

export default function SecurityPage() {
  const [profile, setProfile] = React.useState<ProfileOverview | null>(null);
  const [devices, setDevices] = React.useState<SecurityDeviceRow[]>([]);
  const [blacklist, setBlacklist] = React.useState<SecurityBlacklistRow[]>([]);
  const [privacy, setPrivacy] = React.useState<SecurityPrivacySettings | null>(null);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([loadProfileOverview(), loadSecurityDevices(), loadSecurityBlacklist(), loadPrivacySettings()])
      .then(([profileResult, devicesResult, blacklistResult, privacyResult]) => {
        if (!cancelled) {
          setProfile(profileResult.data);
          setDevices(devicesResult.data);
          setBlacklist(blacklistResult.data);
          setPrivacy(privacyResult.data);
          setNoticeMessage(
            profileResult.notice || devicesResult.notice || blacklistResult.notice || privacyResult.notice || null
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setProfile(null);
          setDevices([]);
          setBlacklist([]);
          setPrivacy(null);
          setErrorMessage(getErrorMessage(error, '安全中心加载失败，请稍后重试'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleTogglePrivacy = async (key: keyof SecurityPrivacySettings) => {
    if (!privacy) return;
    const nextValue = !privacy[key];
    const previous = privacy;
    setSavingKey(key);
    setSuccessMessage(null);
    setPrivacy({
      ...privacy,
      [key]: nextValue
    });

    try {
      const nextSettings = await updatePrivacySettings({ [key]: nextValue });
      setPrivacy(nextSettings);
      setSuccessMessage('隐私设置已更新');
    } catch (error) {
      setPrivacy(previous);
      setErrorMessage(getErrorMessage(error, '隐私设置更新失败，请稍后重试'));
    } finally {
      setSavingKey(null);
    }
  };

  const handleRemoveBlacklist = async (targetPhone: string) => {
    const previous = blacklist;
    setBlacklist((current) => current.filter((item) => item.phone !== targetPhone));
    setSuccessMessage(null);
    try {
      await removeBlacklistContact(targetPhone);
      setSuccessMessage('已移出黑名单');
    } catch (error) {
      setBlacklist(previous);
      setErrorMessage(getErrorMessage(error, '移出黑名单失败，请稍后重试'));
    }
  };

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>安全中心</h1>
          <p>管理登录设备、黑名单与隐私配置。</p>
        </div>
        <Link className="mini-link" to="/h5/settings">
          返回设置
        </Link>
      </header>
      <div className="placeholder-list">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        {successMessage ? <div className="success-banner">{successMessage}</div> : null}
        <section className="section-card">
          <h2>当前安全等级</h2>
          <p>{profile?.safetyLevel || '--'}</p>
        </section>
        <section className="list-stack" aria-label="设备列表">
          <article className="list-row">
            <div>
              <strong>已登录设备</strong>
              <span>{`当前共 ${devices.length} 台设备处于登录状态`}</span>
            </div>
          </article>
          {devices.map((item) => (
            <article key={item.deviceId} className="list-row">
              <div>
                <strong>{`${item.platform} · ${item.deviceId}`}</strong>
                <span>{`最后活跃于 ${new Date(item.lastActiveAt).toLocaleString('zh-CN')}`}</span>
              </div>
              <em>{item.status}</em>
            </article>
          ))}
        </section>
        <section className="list-stack" aria-label="隐私设置">
          {privacyRows.map((item) => {
            const enabled = Boolean(privacy?.[item.key]);
            return (
              <article key={item.key} className="list-row">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  aria-label={`${enabled ? '关闭' : '开启'} ${item.title}`}
                  disabled={savingKey === item.key}
                  onClick={() => {
                    void handleTogglePrivacy(item.key);
                  }}
                >
                  {savingKey === item.key ? '更新中...' : enabled ? '已开启' : '已关闭'}
                </button>
              </article>
            );
          })}
        </section>
        <section className="list-stack" aria-label="黑名单">
          <article className="list-row">
            <div>
              <strong>黑名单</strong>
              <span>{`当前共 ${blacklist.length} 位联系人受限`}</span>
            </div>
          </article>
          {blacklist.length ? (
            blacklist.map((item) => (
              <article key={item.phone} className="list-row">
                <div>
                  <strong>{item.name}</strong>
                  <span>{`${item.phone} · ${item.reason}`}</span>
                </div>
                <button
                  className="text-button"
                  type="button"
                  aria-label={`移出 ${item.name}`}
                  onClick={() => {
                    void handleRemoveBlacklist(item.phone);
                  }}
                >
                  移出黑名单
                </button>
              </article>
            ))
          ) : (
            <article className="list-row">
              <div>
                <strong>暂无黑名单联系人</strong>
                <span>当前账号未限制任何联系人。</span>
              </div>
            </article>
          )}
        </section>
      </div>
    </section>
  );
}
