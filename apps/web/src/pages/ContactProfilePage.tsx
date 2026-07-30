import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createDirectConversation } from '../api/chat';
import {
  acceptFriendRequest,
  blockContact,
  deleteContact,
  loadContactProfile,
  reportContact,
  sendFriendRequest,
  type ContactProfileRow
} from '../api/contacts';
import { getErrorMessage } from '../api/loadable';

const relationshipLabels: Record<ContactProfileRow['relationship'], string> = {
  SELF: '自己',
  FRIEND: '好友',
  PENDING_INCOMING: '待你通过',
  PENDING_OUTGOING: '等待对方通过',
  BLOCKED: '已拉黑',
  NONE: '未添加'
};

export default function ContactProfilePage() {
  const navigate = useNavigate();
  const { targetPhone = '' } = useParams();
  const [profile, setProfile] = React.useState<ContactProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [note, setNote] = React.useState('你好，想加你为好友。');
  const [reportReason, setReportReason] = React.useState('疑似骚扰或异常触达');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const nextProfile = await loadContactProfile(targetPhone);
    setProfile(nextProfile);
    setNote(nextProfile.requestNote || '你好，想加你为好友。');
    return nextProfile;
  }, [targetPhone]);

  React.useEffect(() => {
    let cancelled = false;

    void refresh()
      .then(() => {
        if (cancelled) return;
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error, '联系人资料加载失败，请稍后重试'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const withAction = async (action: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await action();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '联系人操作失败，请稍后重试'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>联系人资料</h1>
          <p>在资料页完成发送申请、删除、拉黑、举报和发消息。</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          返回通讯录
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {successMessage ? <div className="section-card section-card-muted">{successMessage}</div> : null}
        {loading ? <p className="conversation-state">联系人资料加载中...</p> : null}
        {!loading && profile ? (
          <>
            <section className="section-card">
              <div className="detail-row-main">
                <div className="detail-avatar" aria-hidden="true">
                  {profile.name.slice(0, 1)}
                </div>
                <div className="detail-copy">
                  <strong>{profile.name}</strong>
                  <span>{profile.phone}</span>
                  <p>当前状态：{relationshipLabels[profile.relationship]}</p>
                </div>
              </div>
              <div className="tag-chip-row">
                {profile.tags.length
                  ? profile.tags.map((tag) => (
                      <span key={tag.id} className="tag-chip">
                        {tag.title}
                      </span>
                    ))
                  : <span className="tag-chip">暂无标签</span>}
              </div>
            </section>

            {profile.relationship === 'NONE' ? (
              <section className="section-card">
                <strong>发送好友申请</strong>
                <label className="search-box" htmlFor="contact-request-note">
                  <span>附言</span>
                  <input
                    id="contact-request-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="请输入附言"
                  />
                </label>
                <button
                  type="button"
                  className="primary-button"
                  disabled={actionLoading || !note.trim()}
                  onClick={() =>
                    void withAction(async () => {
                      await sendFriendRequest(profile.phone, note);
                      const nextProfile = await refresh();
                      setSuccessMessage(`${nextProfile.name} 的好友申请已发送。`);
                    })
                  }
                >
                  {actionLoading ? '发送中...' : '发送好友申请'}
                </button>
              </section>
            ) : null}

            {profile.relationship === 'PENDING_INCOMING' ? (
              <section className="section-card">
                <strong>收到对方好友申请</strong>
                <p>{profile.requestNote || '请在这里确认是否通过该联系人。'}</p>
                <button
                  type="button"
                  className="primary-button"
                  disabled={actionLoading || !profile.requestId}
                  onClick={() =>
                    void withAction(async () => {
                      if (!profile.requestId) return;
                      await acceptFriendRequest(profile.requestId);
                      const nextProfile = await refresh();
                      setSuccessMessage(`已通过 ${nextProfile.name} 的好友申请。`);
                    })
                  }
                >
                  {actionLoading ? '处理中...' : '通过好友申请'}
                </button>
              </section>
            ) : null}

            {profile.relationship === 'PENDING_OUTGOING' ? (
              <section className="section-card section-card-muted">
                <strong>好友申请已发送</strong>
                <p>{profile.requestNote || '等待对方处理你的好友申请。'}</p>
              </section>
            ) : null}

            {profile.canSendMessage ? (
              <section className="section-card">
                <strong>好友管理</strong>
                <div className="detail-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={actionLoading}
                    onClick={() =>
                      void withAction(async () => {
                        const conversation = await createDirectConversation(profile.phone);
                        if (!conversation?.id) {
                          throw new Error('会话创建成功，但服务端未返回会话 ID');
                        }
                        navigate(`/h5/chat/${conversation.id}`);
                      })
                    }
                  >
                    发消息
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={actionLoading}
                    onClick={() =>
                      void withAction(async () => {
                        await deleteContact(profile.phone);
                        const nextProfile = await refresh();
                        setSuccessMessage(`${nextProfile.name} 已从通讯录移除。`);
                      })
                    }
                  >
                    删除好友
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={actionLoading}
                    onClick={() =>
                      void withAction(async () => {
                        await blockContact(profile.phone);
                        const nextProfile = await refresh();
                        setSuccessMessage(`${nextProfile.name} 已加入黑名单。`);
                      })
                    }
                  >
                    拉黑
                  </button>
                </div>
              </section>
            ) : null}

            {profile.relationship === 'BLOCKED' ? (
              <section className="section-card section-card-muted">
                <strong>已拉黑</strong>
                <p>该联系人已被拉黑，不再显示在你的常用联系人列表中。</p>
              </section>
            ) : null}

            {profile.relationship !== 'SELF' ? (
              <section className="section-card">
                <strong>举报联系人</strong>
                <label className="search-box" htmlFor="contact-report-reason">
                  <span>举报原因</span>
                  <input
                    id="contact-report-reason"
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    placeholder="请输入举报原因"
                  />
                </label>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={actionLoading || !reportReason.trim()}
                  onClick={() =>
                    void withAction(async () => {
                      await reportContact(profile.phone, reportReason);
                      setSuccessMessage(`已提交对 ${profile.name} 的举报。`);
                    })
                  }
                >
                  {actionLoading ? '提交中...' : '提交举报'}
                </button>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
