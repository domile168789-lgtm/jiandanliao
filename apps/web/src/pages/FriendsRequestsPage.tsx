import React from 'react';
import { Link } from 'react-router-dom';

export default function FriendsRequestsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>新的朋友</h1>
          <p>这里会展示新的好友请求和手机号添加入口。</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          返回通讯录
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会展示新的好友请求和手机号添加入口。</p>
        </section>
      </div>
    </section>
  );
}
