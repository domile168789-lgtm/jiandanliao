import React from 'react';
import { Link } from 'react-router-dom';
import { searchEntries } from './wechatSecondaryData';

export default function SearchHubPage() {
  const [query, setQuery] = React.useState('');

  const results = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return searchEntries;
    return searchEntries.filter((item) => {
      return `${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(keyword);
    });
  }, [query]);

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>搜一搜</h1>
          <p>聚合联系人、群聊、服务和内容，保持微信式统一搜索入口。</p>
        </div>
        <Link className="mini-link" to="/h5/discover">
          返回发现
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <label className="search-box" htmlFor="search-hub-keyword">
          <span>搜索联系人、群聊、服务或内容</span>
          <input
            id="search-hub-keyword"
            name="search-hub-keyword"
            placeholder="例如：钱包 / 商务 / 群聊"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <section className="stack-panel" aria-label="搜索结果">
          {results.map((item) => (
            <Link key={item.id} className="detail-row-link" to={item.to}>
              <article className="detail-row-card">
                <div className="detail-copy">
                  <strong>{item.title}</strong>
                  <span>{item.type}</span>
                  <p>{item.subtitle}</p>
                </div>
              </article>
            </Link>
          ))}
          {!results.length ? (
            <article className="detail-row-card">
              <div className="detail-copy">
                <strong>没有找到相关结果</strong>
                <p>可以换个关键词，或从发现页入口继续浏览。</p>
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </section>
  );
}
