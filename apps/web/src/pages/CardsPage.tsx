import React from 'react';
import { Link } from 'react-router-dom';
import { cardWalletItems } from './wechatSecondaryData';

export default function CardsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>卡包</h1>
          <p>查看优惠券、身份卡和活动凭证，保持微信式卡包浏览习惯。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="stack-panel" aria-label="卡包列表">
          {cardWalletItems.map((item) => (
            <article key={item.id} className="detail-row-card">
              <div className="detail-copy">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
              <em>{item.status}</em>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
