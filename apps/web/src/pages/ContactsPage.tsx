import React from 'react';
import { useNavigate } from 'react-router-dom';
import { buildFallbackConversationId, createDirectConversation } from '../api/chat';

const contacts = [
  { id: 'c-1', name: '运营通知', phone: '855010100001', tag: '系统' },
  { id: 'c-2', name: '商务对接', phone: '855010100002', tag: '商务' },
  { id: 'c-3', name: '渠道伙伴', phone: '855010100003', tag: '代理' },
  { id: 'c-4', name: '安全专员', phone: '855010100004', tag: '安全' }
];

export default function ContactsPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = React.useState('');

  const rows = React.useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) => {
      return [contact.name, contact.phone, contact.tag].some((value) =>
        value.toLowerCase().includes(normalized)
      );
    });
  }, [keyword]);

  const handleStartChat = async (phone: string) => {
    try {
      const conversation = await createDirectConversation(phone);
      navigate(`/h5/chat/${conversation?.id || buildFallbackConversationId(phone)}`);
    } catch {
      navigate(`/h5/chat/${buildFallbackConversationId(phone)}`);
    }
  };

  return (
    <section className="h5-page">
      <header className="top-bar">
        <h1>通讯录</h1>
      </header>
      <div className="placeholder-list contacts-page">
        <label className="search-box">
          <span>搜索联系人</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="输入昵称、手机号或标签"
          />
        </label>

        {rows.map((contact) => (
          <article key={contact.id} className="contact-card">
            <div>
              <strong>{contact.name}</strong>
              <span>{contact.phone}</span>
            </div>
            <button className="mini-link button-link" type="button" onClick={() => handleStartChat(contact.phone)}>
              发起单聊
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
