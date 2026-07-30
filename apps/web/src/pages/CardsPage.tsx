import React from 'react';
import { Link } from 'react-router-dom';

export default function CardsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>卡包</h1>
          <p>这里会展示会员卡、优惠券和业务凭证。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会展示会员卡、优惠券和业务凭证。</p>
        </section>
      </div>
    </section>
  );
}
