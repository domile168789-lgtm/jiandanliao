import React from 'react';
import { Link } from 'react-router-dom';

export default function StickersPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>表情</h1>
          <p>这里会管理已下载表情和最近使用记录。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会管理已下载表情和最近使用记录。</p>
        </section>
      </div>
    </section>
  );
}
