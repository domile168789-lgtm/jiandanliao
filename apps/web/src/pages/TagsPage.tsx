import React from 'react';
import { Link } from 'react-router-dom';
import {
  addTagMember,
  createContactTag,
  loadContactTags,
  loadContacts,
  loadTagMembers,
  removeTagMember,
  type ContactRow,
  type ContactTagRow
} from '../api/contacts';
import { getErrorMessage } from '../api/loadable';

export default function TagsPage() {
  const [query, setQuery] = React.useState('');
  const [newTagTitle, setNewTagTitle] = React.useState('');
  const [tags, setTags] = React.useState<ContactTagRow[]>([]);
  const [contacts, setContacts] = React.useState<ContactRow[]>([]);
  const [selectedContactMap, setSelectedContactMap] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [actingTagId, setActingTagId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void Promise.all([loadContactTags(), loadContacts()])
      .then(async ([tagData, contactData]) => {
        if (cancelled) return;
        const membersByTag = await Promise.all(
          tagData.map(async (tag) => ({
            tagId: tag.id,
            members: await loadTagMembers(tag.id)
          }))
        );
        if (cancelled) return;
        const nextTags = tagData.map((tag) => ({
          ...tag,
          members: membersByTag.find((item) => item.tagId === tag.id)?.members || tag.members
        }));
        setTags(nextTags);
        setContacts(contactData);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error, '标签加载失败，请稍后重试'));
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

  const filteredTags = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return tags;
    return tags.filter((item) =>
      `${item.title} ${item.note} ${item.members.map((member) => `${member.name} ${member.phone}`).join(' ')}`.toLowerCase().includes(keyword)
    );
  }, [query, tags]);

  const replaceTag = React.useCallback((tagId: string, updater: (tag: ContactTagRow) => ContactTagRow) => {
    setTags((current) => current.map((tag) => (tag.id === tagId ? updater(tag) : tag)));
  }, []);

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>标签</h1>
          <p>按业务属性管理联系人分组，方便批量查找和触达。</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          返回通讯录
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="section-card section-card-muted">
          <strong>标签同步说明</strong>
          <p>当前页面已改为真实接口驱动，可继续在后端扩展成员管理与批量操作。</p>
        </section>
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        <section className="section-card tag-editor-card">
          <label className="search-box" htmlFor="tag-search-keyword">
            <span>搜索标签或联系人</span>
            <input
              id="tag-search-keyword"
              name="tag-search-keyword"
              placeholder="例如：渠道 / 安全 / 商务"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="inline-form">
            <input
              aria-label="新标签名称"
              placeholder="输入新标签名称"
              value={newTagTitle}
              onChange={(event) => setNewTagTitle(event.target.value)}
            />
            <button
              type="button"
              className="primary-button is-small"
              disabled={submitting || !newTagTitle.trim()}
              onClick={async () => {
                const title = newTagTitle.trim();
                if (!title) return;
                setSubmitting(true);
                try {
                  const created = await createContactTag(title);
                  setTags((current) => [created, ...current]);
                  setNewTagTitle('');
                  setErrorMessage(null);
                } catch (error) {
                  setErrorMessage(getErrorMessage(error, '新建标签失败，请稍后重试'));
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? '创建中...' : '新建标签'}
            </button>
          </div>
        </section>
        {loading ? <p className="conversation-state">标签加载中...</p> : null}
        <section className="tag-grid" aria-label="联系人标签列表">
          {filteredTags.map((item) => (
            <article key={item.id} className="tag-card">
              <div className="tag-card-header">
                <strong>{item.title}</strong>
                <em>{item.count} 人</em>
              </div>
              <p>{item.note}</p>
              <div className="tag-chip-row">
                {item.members.length
                  ? item.members.map((member) => (
                      <span key={member.phone} className="tag-chip">
                        {member.name}
                        <button
                          type="button"
                          className="button-link"
                          disabled={actingTagId === item.id}
                          onClick={async () => {
                            setActingTagId(item.id);
                            try {
                              await removeTagMember(item.id, member.phone);
                              replaceTag(item.id, (tag) => ({
                                ...tag,
                                count: Math.max(0, tag.count - 1),
                                members: tag.members.filter((current) => current.phone !== member.phone)
                              }));
                              setErrorMessage(null);
                            } catch (error) {
                              setErrorMessage(getErrorMessage(error, '移除标签成员失败，请稍后重试'));
                            } finally {
                              setActingTagId(null);
                            }
                          }}
                        >
                          移出
                        </button>
                      </span>
                    ))
                  : <span className="tag-chip">待添加成员</span>}
              </div>
              <div className="inline-form">
                <select
                  aria-label={`选择 ${item.title} 的联系人`}
                  value={selectedContactMap[item.id] || ''}
                  onChange={(event) =>
                    setSelectedContactMap((current) => ({
                      ...current,
                      [item.id]: event.target.value
                    }))
                  }
                >
                  <option value="">选择联系人</option>
                  {contacts
                    .filter((contact) => !item.members.some((member) => member.phone === contact.phone))
                    .map((contact) => (
                      <option key={`${item.id}-${contact.phone}`} value={contact.phone}>
                        {contact.name} ({contact.phone})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="primary-button is-small"
                  disabled={actingTagId === item.id || !selectedContactMap[item.id]}
                  onClick={async () => {
                    const contactPhone = selectedContactMap[item.id];
                    if (!contactPhone) return;
                    const target = contacts.find((contact) => contact.phone === contactPhone);
                    if (!target) return;
                    setActingTagId(item.id);
                    try {
                      await addTagMember(item.id, contactPhone);
                      replaceTag(item.id, (tag) => ({
                        ...tag,
                        count: tag.count + 1,
                        members: [...tag.members, { id: target.id, name: target.name, phone: target.phone }]
                      }));
                      setSelectedContactMap((current) => ({
                        ...current,
                        [item.id]: ''
                      }));
                      setErrorMessage(null);
                    } catch (error) {
                      setErrorMessage(getErrorMessage(error, '添加标签成员失败，请稍后重试'));
                    } finally {
                      setActingTagId(null);
                    }
                  }}
                >
                  {actingTagId === item.id ? '处理中...' : '添加成员'}
                </button>
              </div>
            </article>
          ))}
          {!filteredTags.length ? (
            <article className="tag-card">
              <strong>未找到匹配标签</strong>
              <p>可换个关键词，或直接新建一个新的联系人分组。</p>
            </article>
          ) : null}
        </section>
      </div>
    </section>
  );
}
