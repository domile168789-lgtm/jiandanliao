import React from 'react';
import { Link } from 'react-router-dom';
import { createContactTag, loadContactTags, type ContactTagRow } from '../api/contacts';
import { getErrorMessage } from '../api/loadable';

export default function TagsPage() {
  const [query, setQuery] = React.useState('');
  const [newTagTitle, setNewTagTitle] = React.useState('');
  const [tags, setTags] = React.useState<ContactTagRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    void loadContactTags()
      .then((data) => {
        if (cancelled) return;
        setTags(data);
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
      `${item.title} ${item.note} ${item.members.join(' ')}`.toLowerCase().includes(keyword)
    );
  }, [query, tags]);

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
                {item.members.length ? item.members.map((member) => (
                  <span key={member} className="tag-chip">
                    {member}
                  </span>
                )) : <span className="tag-chip">待添加成员</span>}
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
