import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createGroupConversation, loadSelectableContacts, type SelectableContactRow } from '../api/chat';

export default function NewGroupConfirmPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const memberPhones = React.useMemo(
    () => ((location.state as { memberPhones?: string[] } | null)?.memberPhones || []).filter(Boolean),
    [location.state]
  );
  const [contacts, setContacts] = React.useState<SelectableContactRow[]>([]);
  const [title, setTitle] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void loadSelectableContacts().then((rows) => {
      if (!cancelled) {
        setContacts(rows);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedContacts = React.useMemo(
    () => contacts.filter((item) => memberPhones.includes(item.phone)),
    [contacts, memberPhones]
  );

  const handleSubmit = async () => {
    if (memberPhones.length < 2) {
      setErrorMessage('请先返回上一步选择至少 2 位联系人');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await createGroupConversation({
        title,
        memberPhones
      });

      if (!created) {
        setErrorMessage('建群失败，请稍后重试');
        return;
      }

      navigate(`/h5/chat/${created.id}`, {
        replace: true,
        state: {
          conversationTitle: created.title || title.trim() || '新的群聊',
          conversationType: created.type || 'GROUP'
        }
      });
    } catch {
      setErrorMessage('建群失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>填写群聊信息</h1>
          <p>确认群聊名称并检查成员列表，完成后会直接跳转到新群会话。</p>
        </div>
        <Link className="mini-link" to="/h5/group/new">
          返回上一步
        </Link>
      </header>

      <div className="placeholder-list list-stack">
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

        <article className="section-card">
          <h2>已选成员</h2>
          <p>当前共 {memberPhones.length} 人，将和你一起加入新群聊。</p>
        </article>

        {selectedContacts.map((contact) => (
          <article key={contact.phone} className="contact-card">
            <div>
              <strong>{contact.title}</strong>
              <span>{contact.phone}</span>
            </div>
            <span className={`contact-choice-tag is-${contact.type.toLowerCase()}`}>{contact.type}</span>
          </article>
        ))}

        <label className="search-box">
          <span>群名称</span>
          <input
            aria-label="群名称"
            placeholder="请输入群名称"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <button className="primary-button" type="button" disabled={submitting} onClick={handleSubmit}>
          {submitting ? '创建中...' : '完成'}
        </button>
      </div>
    </section>
  );
}
