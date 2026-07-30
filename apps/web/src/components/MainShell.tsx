import React from 'react';
import { Link } from 'react-router-dom';
import {
  loadConversations,
  subscribeRealtimeMessages,
  subscribePreviewImUpdates,
  type ConversationRow
} from '../api/chat';
import { getErrorMessage } from '../api/loadable';
import DataModeNotice from './DataModeNotice';

const plusMenuItems = [
  { label: '发起群聊', to: '/h5/group/new', icon: '群' },
  { label: '添加朋友', to: '/h5/discover/search', icon: '友' },
  { label: '扫一扫', to: '/h5/discover/scan', icon: '扫' },
  { label: '收付款', to: '/h5/wallet', icon: '付' }
] as const;

export default function MainShell() {
  const [rows, setRows] = React.useState<ConversationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const conversationIds = React.useMemo(() => rows.map((row) => row.id), [rows]);

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

  React.useEffect(() => {
    const unsubscribe = subscribeRealtimeMessages(
      () => {
        void refresh();
      },
      { conversationIds }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationIds, refresh]);

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split top-bar-compact">
        <div className="top-bar-title-only">
          <h1>消息</h1>
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
                {plusMenuItems.map((item) => (
                  <Link key={item.to} className="plus-menu-item" to={item.to} onClick={() => setMenuOpen(false)}>
                    <span className="plus-menu-item-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </header>

      <section className="placeholder-list conversation-list" aria-label="消息列表">
        {loading ? <p className="conversation-state">会话加载中...</p> : null}
        {!loading && errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {!loading && noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}

        {!loading && rows.length === 0 ? <p className="conversation-state">暂无会话</p> : null}

        {rows.map((row) => (
          <Link
            key={row.id}
            className="conversation-link"
            to={`/h5/chat/${row.id}`}
            state={{ conversationTitle: row.title || row.type, conversationType: row.type }}
          >
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
                <div className="conversation-summary-row">
                  <span>{row.lastMessage || '暂无消息'}</span>
                  {row.unreadCount ? <span className="conversation-unread-badge">{row.unreadCount}</span> : null}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </section>
    </section>
  );
}
