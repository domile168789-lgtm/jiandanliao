import React from 'react';
import { Link } from 'react-router-dom';
import { momentsFeed } from './wechatSecondaryData';

export default function MomentsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>朋友圈</h1>
          <p>查看业务动态、活动进展和团队最新互动。</p>
        </div>
        <Link className="mini-link" to="/h5/discover">
          返回发现
        </Link>
      </header>
      <div className="placeholder-list moments-page">
        <section className="moments-hero">
          <div>
            <strong>今天也有新的合作动态</strong>
            <span>默认展示演示朋友圈内容，后续可继续接入真实动态流。</span>
          </div>
          <Link className="mini-link" to="/h5/profile">
            我的主页
          </Link>
        </section>
        <section className="stack-panel" aria-label="朋友圈动态">
          {momentsFeed.map((item) => (
            <article key={item.id} className="moment-card">
              <div className="moment-header">
                <div className="detail-avatar is-moment" aria-hidden="true">
                  {item.author.slice(0, 1)}
                </div>
                <div className="detail-copy">
                  <strong>{item.author}</strong>
                  <span>{item.time}</span>
                </div>
              </div>
              <p className="moment-text">{item.text}</p>
              <div className="moment-media">{item.mediaLabel}</div>
              <div className="moment-meta">
                <span>{item.likes} 赞</span>
                <span>{item.comments} 评论</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
