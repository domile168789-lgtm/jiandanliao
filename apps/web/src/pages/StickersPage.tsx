import React from 'react';
import { Link } from 'react-router-dom';
import { stickerPacks } from './wechatSecondaryData';

export default function StickersPage() {
  const [installedIds, setInstalledIds] = React.useState<string[]>(
    stickerPacks.filter((item) => item.installed).map((item) => item.id)
  );

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>表情</h1>
          <p>管理已下载表情包和常用沟通素材，保留微信式表情管理入口。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="stack-panel" aria-label="表情包列表">
          {stickerPacks.map((item) => {
            const installed = installedIds.includes(item.id);
            return (
              <article key={item.id} className="detail-row-card">
                <div className="detail-copy">
                  <strong>{item.title}</strong>
                  <span>{item.downloads} 次下载</span>
                  <p>{item.description}</p>
                </div>
                <button
                  type="button"
                  className={installed ? 'secondary-button is-quiet' : 'primary-button is-small'}
                  onClick={() => {
                    if (installed) return;
                    setInstalledIds((current) => [...current, item.id]);
                  }}
                >
                  {installed ? '已添加' : '添加'}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </section>
  );
}
