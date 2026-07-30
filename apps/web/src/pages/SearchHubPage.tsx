import React from 'react';
import { Link } from 'react-router-dom';

export default function SearchHubPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>搜一搜</h1>
          <p>这里会聚合联系人、群聊与服务搜索入口。</p>
        </div>
        <Link className="mini-link" to="/h5/discover">
          返回发现
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会聚合联系人、群聊与服务搜索入口。</p>
        </section>
      </div>
    </section>
  );
}
