import React from 'react';
import { Link } from 'react-router-dom';
import { favoriteItems } from './wechatSecondaryData';

export default function FavoritesPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>收藏</h1>
          <p>汇总常用文档、消息和文件，方便从“我的”页快速回看。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="stack-panel" aria-label="收藏内容">
          {favoriteItems.map((item) => (
            <article key={item.id} className="detail-row-card">
              <div className="detail-copy">
                <strong>{item.title}</strong>
                <span>{item.category}</span>
                <p>{item.summary}</p>
              </div>
              <em>{item.source}</em>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
