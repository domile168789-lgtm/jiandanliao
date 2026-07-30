import React from 'react';
import { Link } from 'react-router-dom';

export default function TagsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>标签</h1>
          <p>这里会展示联系人标签与分组管理能力。</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          返回通讯录
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会展示联系人标签与分组管理能力。</p>
        </section>
      </div>
    </section>
  );
}
