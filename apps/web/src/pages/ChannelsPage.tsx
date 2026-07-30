import React from 'react';
import { Link } from 'react-router-dom';
import { channelTopics } from './wechatSecondaryData';

export default function ChannelsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>看一看</h1>
          <p>汇总推荐内容、热点主题和适合继续阅读的频道。</p>
        </div>
        <Link className="mini-link" to="/h5/discover">
          返回发现
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="section-card section-card-muted">
          <strong>今日推荐</strong>
          <p>按运营、安全、增长等业务主题聚合内容，保留微信式“看一看”浏览节奏。</p>
        </section>
        <section className="stack-panel" aria-label="频道推荐列表">
          {channelTopics.map((item) => (
            <article key={item.id} className="content-card">
              <div className="content-card-meta">
                <em>{item.tag}</em>
                <span>{item.heat}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.summary}</p>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
