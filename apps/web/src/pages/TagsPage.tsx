import React from 'react';
import { Link } from 'react-router-dom';
import { contactTags } from './wechatSecondaryData';

export default function TagsPage() {
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
          <p>当前页面提供微信式标签分组浏览，后续可继续接入真实批量管理能力。</p>
        </section>
        <section className="tag-grid" aria-label="联系人标签列表">
          {contactTags.map((item) => (
            <article key={item.id} className="tag-card">
              <div className="tag-card-header">
                <strong>{item.title}</strong>
                <em>{item.count} 人</em>
              </div>
              <p>{item.note}</p>
              <div className="tag-chip-row">
                {item.members.map((member) => (
                  <span key={member} className="tag-chip">
                    {member}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
