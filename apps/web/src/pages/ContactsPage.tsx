import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createDirectConversation } from '../api/chat';
import { loadContacts, type ContactRow } from '../api/contacts';
import { getErrorMessage } from '../api/loadable';
import DataModeNotice from '../components/DataModeNotice';

const contactEntries = [
  { title: '新的朋友', subtitle: '查看新的添加请求', to: '/h5/contacts/friends', icon: '友' },
  { title: '群聊', subtitle: '查看和管理群会话', to: '/h5/contacts/groups', icon: '群' },
  { title: '标签', subtitle: '管理联系人分组', to: '/h5/contacts/tags', icon: '标' },
  { title: '公众号', subtitle: '查看服务账号', to: '/h5/contacts/official-accounts', icon: '号' }
] as const;

export default function ContactsPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = React.useState('');
  const [contacts, setContacts] = React.useState<ContactRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void loadContacts()
      .then((data) => {
        if (cancelled) return;
        setContacts(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error, '联系人加载失败，请稍后重试'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = React.useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) => {
      return [contact.name, contact.phone, contact.note, ...contact.tags.map((tag) => tag.title)].some((value) =>
        value.toLowerCase().includes(normalized)
      );
    });
  }, [keyword]);

  const handleStartChat = async (phone: string) => {
    try {
      const conversation = await createDirectConversation(phone);
      if (!conversation?.id) {
        setErrorMessage('会话创建成功，但服务端未返回会话 ID');
        return;
      }
      setErrorMessage(null);
      navigate(`/h5/chat/${conversation.id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '发起单聊失败，请稍后重试'));
    }
  };

  return (
    <section className="h5-page">
      <header className="top-bar">
        <h1>通讯录</h1>
      </header>
      <div className="placeholder-list contacts-page">
        <nav className="contacts-entry-stack" aria-label="通讯录服务入口">
          {contactEntries.map((entry) => (
            <Link key={entry.to} className="contacts-entry-link" to={entry.to}>
              <span className="contacts-entry-icon" aria-hidden="true">
                {entry.icon}
              </span>
              <span className="contacts-entry-copy">
                <strong>{entry.title}</strong>
                <span>{entry.subtitle}</span>
              </span>
              <span className="contacts-entry-arrow" aria-hidden="true">
                &gt;
              </span>
            </Link>
          ))}
        </nav>
        <label className="search-box">
          <span>搜索联系人</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="输入昵称、手机号或标签"
          />
        </label>
        <Link className="primary-link-card" to="/h5/discover/search">
          <strong>添加朋友</strong>
          <span>通过手机号或昵称搜索，进入资料页发送好友申请。</span>
        </Link>
        <DataModeNotice message="通讯录已切换到接口驱动，可进入联系人详情继续完成发送申请、删除、拉黑、举报与标签管理。" />
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {loading ? <p className="conversation-state">联系人加载中...</p> : null}

        {!loading && rows.map((contact) => (
          <article key={contact.id} className="contact-card">
            <div>
              <strong>{contact.name}</strong>
              <span>{contact.phone}</span>
              <span>{contact.tags.length ? contact.tags.map((tag) => tag.title).join(' / ') : '未分配标签'}</span>
            </div>
            <div className="detail-actions">
              <Link className="mini-link" to={`/h5/contacts/profile/${encodeURIComponent(contact.phone)}`}>
                查看资料
              </Link>
              <button className="mini-link button-link" type="button" onClick={() => handleStartChat(contact.phone)}>
                发起单聊
              </button>
            </div>
          </article>
        ))}
        {!loading && !rows.length ? (
          <article className="contact-card">
            <div>
              <strong>暂无联系人</strong>
              <span>可以从搜索入口发送申请，或在新的朋友页处理待通过请求。</span>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
