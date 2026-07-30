import React from 'react';
import { Link } from 'react-router-dom';
import {
  loadConversations,
  subscribePreviewImUpdates,
  type ConversationRow
} from '../api/chat';
import { getErrorMessage } from '../api/loadable';
import DataModeNotice from './DataModeNotice';

export default function MainShell() {
  const [rows, setRows] = React.useState<ConversationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const refresh = React.useCallback(async (cancelledRef?: { current: boolean }) => {
    try {
      const result = await loadConversations();
      if (cancelledRef?.current) return;
      setRows(result.data);
      setNoticeMessage(result.notice || null);
      setErrorMessage(null);
    } catch (error) {
      if (cancelledRef?.current) return;
      setRows([]);
      setErrorMessage(getErrorMessage(error, '会话加载失败，请重新登录后重试'));
    } finally {
      if (cancelledRef?.current) return;
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const cancelled = { current: false };

    void refresh(cancelled)
      .then(() => {
        if (!cancelled.current) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled.current) {
          setLoading(false);
        }
      });

    const unsubscribe = subscribePreviewImUpdates(() => {
      void refresh();
    });

    return () => {
      cancelled.current = true;
      unsubscribe();
    };
  }, [refresh]);

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>消息</h1>
          <p>系统会话、单聊与群聊入口统一收口到这里。</p>
        </div>
        <div className="top-bar-action">
          <button
            type="button"
            aria-label="打开快捷菜单"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="messages-plus-menu"
            className="mini-link mini-link-icon button-link"
            onClick={() => setMenuOpen((value) => !value)}
          >
            +
          </button>

          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="关闭快捷菜单"
                className="plus-menu-backdrop"
                onClick={() => setMenuOpen(false)}
              />
              <div id="messages-plus-menu" className="plus-menu" role="menu" aria-label="快捷菜单">
                <Link className="plus-menu-item" to="/h5/group/new" onClick={() => setMenuOpen(false)}>
                  <span className="plus-menu-item-icon" aria-hidden="true">
                    群
                  </span>
                  <span>发起群聊</span>
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </header>

      <section className="placeholder-list" aria-label="消息列表">
        {loading ? <p className="conversation-state">会话加载中...</p> : null}
        {!loading && errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {!loading && noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}

        {!loading && rows.length === 0 ? <p className="conversation-state">暂无会话</p> : null}

        {rows.map((row) => (
          <Link key={row.id} className="conversation-link" to={`/h5/chat/${row.id}`}>
            <article className="conversation-row">
              <div className={`conversation-avatar conversation-avatar-${row.type.toLowerCase()}`} aria-hidden="true">
                {(row.title || row.type).slice(0, 1)}
              </div>
              <div className="conversation-copy">
                <div className="conversation-title-row">
                  <strong>{row.title || row.type}</strong>
                  <div className="conversation-meta">
                    <span className={`conversation-tag is-${row.type.toLowerCase()}`}>{row.type}</span>
                    {row.updatedAt ? (
                      <time dateTime={row.updatedAt}>
                        {new Date(row.updatedAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    ) : null}
                  </div>
                </div>
                <span>{row.lastMessage || '暂无消息'}</span>
              </div>
            </article>
          </Link>
        ))}
      </section>
    </section>
  );
}
