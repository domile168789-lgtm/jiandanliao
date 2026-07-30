import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  inviteConversationMembers,
  leaveConversationGroup,
  listConversationMembers,
  loadSelectableContacts,
  type GroupMemberRow,
  type SelectableContactRow
} from '../api/chat';
import { getErrorMessage } from '../api/loadable';

export default function ChatSettingsPage() {
  const { conversationId = '' } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = React.useState<GroupMemberRow[]>([]);
  const [contacts, setContacts] = React.useState<SelectableContactRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [invitePhone, setInvitePhone] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const [memberRows, contactRows] = await Promise.all([
      listConversationMembers(conversationId),
      loadSelectableContacts()
    ]);
    setMembers(memberRows);
    setContacts(contactRows);
  }, [conversationId]);

  React.useEffect(() => {
    let cancelled = false;

    void refresh()
      .then(() => {
        if (!cancelled) {
          setErrorMessage(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMembers([]);
          setErrorMessage(getErrorMessage(error, '群成员加载失败，请稍后重试'));
        }
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

  const inviteOptions = React.useMemo(() => {
    const existingPhones = new Set(members.map((item) => item.phone));
    return contacts.filter((item) => item.type !== 'SYSTEM' && !existingPhones.has(item.phone));
  }, [contacts, members]);

  const handleInvite = async () => {
    if (!invitePhone) {
      setErrorMessage('请先选择要邀请的成员');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const result = await inviteConversationMembers(conversationId, [invitePhone]);
      await refresh();
      setInvitePhone('');
      setNoticeMessage(result.invitedCount > 0 ? '已邀请新成员加入群聊' : '所选成员已在群内');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '邀请成员失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      await leaveConversationGroup(conversationId);
      navigate('/h5/messages', { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '退出群聊失败，请稍后重试'));
      setSubmitting(false);
    }
  };

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>群聊设置</h1>
          <p>查看成员、邀请新成员，并执行退群操作。</p>
        </div>
        <Link className="mini-link" to={`/h5/chat/${conversationId}`}>
          返回聊天
        </Link>
      </header>

      <div className="placeholder-list detail-page">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <div className="form-notice">{noticeMessage}</div> : null}
        {loading ? <p className="conversation-state">群成员加载中...</p> : null}

        {!loading ? (
          <section className="section-card">
            <h2>成员列表</h2>
            <p>当前共 {members.length} 人，群主拥有邀请成员权限。</p>
          </section>
        ) : null}

        {!loading ? (
          <section className="member-grid" aria-label="群成员列表">
            {members.map((member) => (
              <article key={member.userId} className="member-card">
                <div className="member-card-main">
                  <strong>{member.name}</strong>
                  <span>{member.phone}</span>
                </div>
                <div className="member-meta">
                  <span className={`member-badge ${member.role === 'OWNER' ? 'is-owner' : 'is-member'}`}>
                    {member.role === 'OWNER' ? '群主' : '成员'}
                  </span>
                  {member.isSelf ? <span className="member-badge is-self">我</span> : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!loading ? (
          <section className="section-card settings-panel">
            <h2>邀请成员</h2>
            <p>从现有联系人中选择 1 位成员加入当前群聊。</p>
            <label className="search-box">
              <span>邀请成员</span>
              <select
                aria-label="邀请成员"
                value={invitePhone}
                onChange={(event) => setInvitePhone(event.target.value)}
                disabled={!inviteOptions.length || submitting}
              >
                <option value="">请选择联系人</option>
                {inviteOptions.map((contact) => (
                  <option key={contact.phone} value={contact.phone}>
                    {contact.title} {contact.phone}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              type="button"
              disabled={submitting || !inviteOptions.length}
              onClick={handleInvite}
            >
              邀请成员
            </button>
          </section>
        ) : null}

        {!loading ? (
          <button className="secondary-button danger-button" type="button" disabled={submitting} onClick={handleLeave}>
            退出群聊
          </button>
        ) : null}
      </div>
    </section>
  );
}
