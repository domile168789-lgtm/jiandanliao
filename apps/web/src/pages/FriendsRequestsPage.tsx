import React from 'react';
import { Link } from 'react-router-dom';
import { acceptFriendRequest, loadFriendRequests, type FriendRequestRow } from '../api/contacts';
import { getErrorMessage } from '../api/loadable';

export default function FriendsRequestsPage() {
  const [rows, setRows] = React.useState<FriendRequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void loadFriendRequests()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error, '好友请求加载失败，请稍后重试'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = rows.filter((item) => item.status !== '已添加').length;

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
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {loading ? <p className="conversation-state">好友请求加载中...</p> : null}
        <section className="stack-panel" aria-label="好友请求列表">
          {rows.map((item) => {
            const accepted = item.status === '已添加';
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
                    <Link className="mini-link" to={`/h5/contacts/profile/${encodeURIComponent(item.phone)}`}>
                      查看资料
                    </Link>
                  </div>
                </div>
                <button
                  type="button"
                  className={accepted ? 'secondary-button is-quiet' : 'primary-button is-small'}
                  disabled={accepted || actingId === item.id}
                  onClick={async () => {
                    if (accepted || actingId) return;
                    setActingId(item.id);
                    try {
                      const updated = await acceptFriendRequest(item.id);
                      setRows((current) => current.map((row) => (row.id === item.id ? updated : row)));
                      setErrorMessage(null);
                    } catch (error) {
                      setErrorMessage(getErrorMessage(error, '通过好友请求失败，请稍后重试'));
                    } finally {
                      setActingId(null);
                    }
                  }}
                >
                  {accepted ? '已通过' : actingId === item.id ? '处理中...' : '通过'}
                </button>
              </article>
            );
          })}
          {!loading && !rows.length ? (
            <article className="detail-row-card">
              <div className="detail-copy">
                <strong>暂无新的好友请求</strong>
                <p>可以从扫一扫、搜索手机号或消息页快捷入口继续添加朋友。</p>
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </section>
  );
}
