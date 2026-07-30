import React from 'react';
import { Link } from 'react-router-dom';
import { serviceSections } from './wechatSecondaryData';

export default function ServicesPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>服务</h1>
          <p>聚合资金、业务和账号类服务，作为“我的”页的统一服务中心。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        {serviceSections.map((section) => (
          <section key={section.title} className="service-group-card">
            <div className="service-group-header">
              <strong>{section.title}</strong>
            </div>
            <div className="service-group-list">
              {section.items.map((item) => (
                <Link key={item.to} className="detail-row-link" to={item.to}>
                  <article className="detail-row-card">
                    <div className="detail-copy">
                      <strong>{item.title}</strong>
                      <p>{item.subtitle}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
