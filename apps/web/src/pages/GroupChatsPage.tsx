import React from 'react';
import { Link } from 'react-router-dom';
import { loadConversations, type ConversationRow } from '../api/chat';
import { getErrorMessage } from '../api/loadable';
import DataModeNotice from '../components/DataModeNotice';

export default function GroupChatsPage() {
  const [rows, setRows] = React.useState<ConversationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void loadConversations()
      .then((result) => {
        if (cancelled) return;
        setRows(result.data.filter((item) => item.type === 'GROUP'));
        setNoticeMessage(result.notice || null);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setRows([]);
        setErrorMessage(getErrorMessage(error, '群聊列表加载失败，请稍后重试'));
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

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>群聊</h1>
          <p>统一查看已加入群聊，并继续发起新的群会话。</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          返回通讯录
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <Link className="primary-link-card" to="/h5/group/new">
          <strong>发起群聊</strong>
          <span>选择联系人、填写群名并立即进入新群。</span>
        </Link>
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {loading ? <p className="conversation-state">群聊列表加载中...</p> : null}
        {!loading && rows.length === 0 ? (
          <section className="section-card section-card-muted">
            <strong>暂未加入群聊</strong>
            <p>可以从消息页 `+` 菜单或当前页面继续创建新的群会话。</p>
          </section>
        ) : null}
        {!loading ? (
          <section className="stack-panel" aria-label="群聊列表">
            {rows.map((item) => (
              <Link key={item.id} className="detail-row-link" to={`/h5/chat/${item.id}`}>
                <article className="detail-row-card">
                  <div className="detail-row-main">
                    <div className="detail-avatar is-group" aria-hidden="true">
                      群
                    </div>
                    <div className="detail-copy">
                      <strong>{item.title || '未命名群聊'}</strong>
                      <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN') : '刚刚更新'}</span>
                      <p>{item.lastMessage || '进入群聊后开始发送消息。'}</p>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </section>
        ) : null}
      </div>
    </section>
  );
}
