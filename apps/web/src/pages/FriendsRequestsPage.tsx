import React from 'react';
import { Link } from 'react-router-dom';
import { friendRequests } from './wechatSecondaryData';

export default function FriendsRequestsPage() {
  const [acceptedIds, setAcceptedIds] = React.useState<string[]>(
    friendRequests.filter((item) => item.status === '已添加').map((item) => item.id)
  );

  const pendingCount = friendRequests.filter((item) => !acceptedIds.includes(item.id)).length;

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>新的朋友</h1>
          <p>{pendingCount ? `还有 ${pendingCount} 个好友请求待处理。` : '新的好友请求都已处理完成。'}</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          返回通讯录
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="section-card section-card-muted">
          <strong>手机号添加入口</strong>
          <p>可通过手机号搜索、扫码添加和企业推荐快速建立联系人关系。</p>
        </section>
        <section className="stack-panel" aria-label="好友请求列表">
          {friendRequests.map((item) => {
            const accepted = acceptedIds.includes(item.id);
            return (
              <article key={item.id} className="detail-row-card">
                <div className="detail-row-main">
                  <div className="detail-avatar" aria-hidden="true">
                    {item.name.slice(0, 1)}
                  </div>
                  <div className="detail-copy">
                    <strong>{item.name}</strong>
                    <span>{item.phone}</span>
                    <p>{item.note}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={accepted ? 'secondary-button is-quiet' : 'primary-button is-small'}
                  disabled={accepted}
                  onClick={() => {
                    setAcceptedIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
                  }}
                >
                  {accepted ? '已通过' : '通过'}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </section>
  );
}
