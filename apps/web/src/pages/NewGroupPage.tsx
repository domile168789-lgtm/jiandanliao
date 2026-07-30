import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadSelectableContacts, type SelectableContactRow } from '../api/chat';

export default function NewGroupPage() {
  const [contacts, setContacts] = React.useState<SelectableContactRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPhones, setSelectedPhones] = React.useState<string[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    let cancelled = false;

    void loadSelectableContacts().then((rows) => {
      if (!cancelled) {
        setContacts(rows);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const togglePhone = (phone: string) => {
    setSelectedPhones((current) =>
      current.includes(phone) ? current.filter((item) => item !== phone) : [...current, phone]
    );
  };

  const handleNext = () => {
    if (selectedPhones.length < 2) return;
    navigate('/h5/group/new/confirm', {
      state: {
        memberPhones: selectedPhones
      }
    });
  };

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>选择联系人</h1>
          <p>至少选择 2 位联系人后进入下一步，当前已选 {selectedPhones.length} 人。</p>
        </div>
        <Link className="mini-link" to="/h5/messages">
          返回消息
        </Link>
      </header>

      <div className="placeholder-list list-stack">
        <label className="search-box">
          <span>联系人来源</span>
          <input value="当前使用演示联系人列表" readOnly aria-label="联系人来源" />
        </label>

        {loading ? <p className="conversation-state">联系人加载中...</p> : null}

        {!loading
          ? contacts.map((contact) => {
              const checked = selectedPhones.includes(contact.phone);
              return (
                <label
                  key={contact.phone}
                  className={`contact-card contact-choice ${checked ? 'is-selected' : ''}`}
                >
                  <div>
                    <strong>{contact.title}</strong>
                    <span>{contact.phone}</span>
                  </div>
                  <span className={`contact-choice-tag is-${contact.type.toLowerCase()}`}>{contact.type}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    aria-label={`选择 ${contact.title}`}
                    onChange={() => togglePhone(contact.phone)}
                  />
                </label>
              );
            })
          : null}

        <button
          className="primary-button"
          type="button"
          disabled={selectedPhones.length < 2}
          onClick={handleNext}
        >
          下一步
        </button>
      </div>
    </section>
  );
}
