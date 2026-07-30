import React from 'react';
import { Link } from 'react-router-dom';
import { momentsFeed } from './wechatSecondaryData';

type FeedRow = (typeof momentsFeed)[number] & { liked?: boolean };

export default function MomentsPage() {
  const [draft, setDraft] = React.useState('');
  const [feed, setFeed] = React.useState<FeedRow[]>(momentsFeed);

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
            <span>先提供本地可发布、可点赞的动态流，后续可继续接入真实朋友圈数据。</span>
          </div>
          <Link className="mini-link" to="/h5/profile">
            我的主页
          </Link>
        </section>
        <section className="section-card moments-composer">
          <strong>发一条动态</strong>
          <label className="search-box" htmlFor="moment-draft">
            <span>动态内容</span>
            <input
              id="moment-draft"
              name="moment-draft"
              placeholder="分享今天的工作进展、活动信息或团队动态"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={!draft.trim()}
            onClick={() => {
              const text = draft.trim();
              if (!text) return;
              setFeed((current) => [
                {
                  id: `moment-local-${Date.now()}`,
                  author: '我',
                  time: '刚刚',
                  text,
                  mediaLabel: '新动态',
                  likes: 0,
                  comments: 0,
                  liked: false
                },
                ...current
              ]);
              setDraft('');
            }}
          >
            发布动态
          </button>
        </section>
        <section className="stack-panel" aria-label="朋友圈动态">
          {feed.map((item) => (
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
                <button
                  type="button"
                  className={item.liked ? 'secondary-button moment-action is-active' : 'secondary-button moment-action'}
                  onClick={() => {
                    setFeed((current) =>
                      current.map((row) =>
                        row.id === item.id
                          ? {
                              ...row,
                              liked: !row.liked,
                              likes: row.liked ? Math.max(0, row.likes - 1) : row.likes + 1
                            }
                          : row
                      )
                    );
                  }}
                >
                  {item.likes} 赞
                </button>
                <button
                  type="button"
                  className="secondary-button moment-action"
                  onClick={() => {
                    setFeed((current) =>
                      current.map((row) =>
                        row.id === item.id
                          ? {
                              ...row,
                              comments: row.comments + 1
                            }
                          : row
                      )
                    );
                  }}
                >
                  {item.comments} 评论
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
