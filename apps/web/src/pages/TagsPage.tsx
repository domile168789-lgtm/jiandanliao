import React from 'react';
import { Link } from 'react-router-dom';
import { contactTags } from './wechatSecondaryData';

export default function TagsPage() {
  const [query, setQuery] = React.useState('');
  const [newTagTitle, setNewTagTitle] = React.useState('');
  const [tags, setTags] = React.useState(contactTags);

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
          <p>当前页面已支持本地新增与筛选，后续可继续接入真实批量管理能力。</p>
        </section>
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
              onClick={() => {
                const title = newTagTitle.trim();
                if (!title) return;
                setTags((current) => [
                  {
                    id: `tag-local-${Date.now()}`,
                    title,
                    count: 0,
                    members: [],
                    note: '新建标签，后续可继续补充成员。'
                  },
                  ...current
                ]);
                setNewTagTitle('');
              }}
            >
              新建标签
            </button>
          </div>
        </section>
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
