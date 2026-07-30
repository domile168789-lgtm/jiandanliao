import React from 'react';
import { Link } from 'react-router-dom';
import { officialAccounts } from './wechatSecondaryData';

export default function OfficialAccountsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>公众号</h1>
          <p>集中收纳官方通知号、业务服务号和常用系统入口。</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          返回通讯录
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="stack-panel" aria-label="公众号列表">
          {officialAccounts.map((item) => (
            <Link key={item.id} className="detail-row-link" to={item.to}>
              <article className="detail-row-card">
                <div className="detail-row-main">
                  <div className="detail-avatar is-brand" aria-hidden="true">
                    {item.badge}
                  </div>
                  <div className="detail-copy">
                    <strong>{item.title}</strong>
                    <span>官方服务入口</span>
                    <p>{item.summary}</p>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </section>
      </div>
    </section>
  );
}
