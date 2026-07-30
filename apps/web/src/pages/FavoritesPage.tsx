import React from 'react';
import { Link } from 'react-router-dom';

export default function FavoritesPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>收藏</h1>
          <p>这里会汇总已保存的消息、链接和文件。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会汇总已保存的消息、链接和文件。</p>
        </section>
      </div>
    </section>
  );
}
