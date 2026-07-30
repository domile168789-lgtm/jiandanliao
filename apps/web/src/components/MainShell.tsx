import React from 'react';
import { Link } from 'react-router-dom';
import { loadConversations, type ConversationRow } from '../api/chat';
import { getErrorMessage } from '../api/loadable';
import DataModeNotice from './DataModeNotice';

const shortcuts = [
  { label: '系统通知', to: '/h5/system-notice', hint: '查看公告与风控结果' },
  { label: '钱包', to: '/h5/wallet', hint: '查看余额与待结算' },
  { label: '收益', to: '/h5/earnings', hint: '查看今日与本月收益' }
];

export default function MainShell() {
  const [rows, setRows] = React.useState<ConversationRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    void loadConversations()
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setNoticeMessage(result.notice || null);
      })
      .catch((error) => {
        if (cancelled) return;
        setRows([]);
        setErrorMessage(getErrorMessage(error, '会话加载失败，请重新登录后重试'));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>消息</h1>
          <p>系统会话、单聊与群聊入口统一收口到这里。</p>
        </div>
        <Link className="mini-link" to="/h5/contacts">
          发起单聊
        </Link>
      </header>

      <section className="shortcut-grid" aria-label="快捷入口">
        {shortcuts.map((shortcut) => (
          <Link key={shortcut.to} className="shortcut-card" to={shortcut.to}>
            <strong>{shortcut.label}</strong>
            <span>{shortcut.hint}</span>
          </Link>
        ))}
      </section>

      <section className="placeholder-list" aria-label="消息列表">
        {loading ? <p className="conversation-state">会话加载中...</p> : null}
        {!loading && errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {!loading && noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}

        {!loading && rows.length === 0 ? <p className="conversation-state">暂无会话</p> : null}

        {rows.map((row) => (
          <Link key={row.id} className="conversation-link" to={`/h5/chat/${row.id}`}>
            <article className="conversation-row">
              <div className="conversation-avatar" aria-hidden="true">
                {(row.title || row.type).slice(0, 1)}
              </div>
              <div className="conversation-copy">
                <div className="conversation-title-row">
                  <strong>{row.title || row.type}</strong>
                  {row.updatedAt ? (
                    <time dateTime={row.updatedAt}>
                      {new Date(row.updatedAt).toLocaleDateString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </time>
                  ) : null}
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
