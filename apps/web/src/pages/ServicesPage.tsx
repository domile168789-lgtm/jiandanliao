import React from 'react';
import { Link } from 'react-router-dom';

export default function ServicesPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>服务</h1>
          <p>这里会展示支付、生活服务和常用工具入口。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会展示支付、生活服务和常用工具入口。</p>
        </section>
      </div>
    </section>
  );
}
