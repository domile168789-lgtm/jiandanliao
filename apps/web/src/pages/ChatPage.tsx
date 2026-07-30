import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { listMessages, sendTextMessage, type MessageRow } from '../api/chat';

const getFallbackMessages = (conversationId: string): MessageRow[] => [
  {
    id: `${conversationId}-system`,
    conversationId,
    senderId: null,
    type: 'SYSTEM',
    body: { text: '欢迎进入当前会话，演示环境下消息会优先本地展示。' },
    createdAt: new Date().toISOString()
  },
  {
    id: `${conversationId}-welcome`,
    conversationId,
    senderId: 'peer',
    type: 'TEXT',
    body: { text: '你好，这里是完整版 H5 聊天页入口。' },
    createdAt: new Date().toISOString()
  }
];

const getMessageText = (row: MessageRow) => {
  if (typeof row.body.text === 'string' && row.body.text) return row.body.text;
  if (row.type === 'SYSTEM' && typeof row.body.title === 'string') return row.body.title;
  if (row.type === 'IMAGE') return '[图片消息]';
  if (row.type === 'AUDIO') return '[语音消息]';
  if (row.type === 'VIDEO') return '[视频消息]';
  if (row.type === 'FILE') return '[文件消息]';
  return '[暂不支持的消息类型]';
};

export default function ChatPage() {
  const { conversationId = 'demo-conversation' } = useParams();
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    setLoading(true);
    void listMessages(conversationId)
      .then((rows) => {
        if (cancelled) return;
        setMessages(rows.length ? rows : getFallbackMessages(conversationId));
      })
      .catch(() => {
        if (cancelled) return;
        setMessages(getFallbackMessages(conversationId));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextDraft = draft.trim();
    if (!nextDraft) return;

    const optimisticMessage: MessageRow = {
      id: `draft-${Date.now()}`,
      conversationId,
      senderId: 'self',
      type: 'TEXT',
      body: { text: nextDraft },
      createdAt: new Date().toISOString()
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft('');
    setSending(true);

    try {
      const created = await sendTextMessage(conversationId, nextDraft);
      if (created) {
        setMessages((current) => [...current.filter((item) => item.id !== optimisticMessage.id), created]);
      }
    } catch {
      // Keep optimistic message in demo mode.
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="h5-page chat-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>聊天</h1>
          <p>会话 ID：{conversationId}</p>
        </div>
        <Link className="mini-link" to="/h5/messages">
          返回消息
        </Link>
      </header>

      <section className="chat-feed" aria-label="聊天消息">
        {loading ? <p className="conversation-state">消息加载中...</p> : null}
        {!loading
          ? messages.map((message) => {
              const isSelf = message.senderId === 'self';
              return (
                <article
                  key={message.id}
                  className={`chat-bubble ${isSelf ? 'is-self' : 'is-peer'} ${message.type === 'SYSTEM' ? 'is-system' : ''}`}
                >
                  <p>{getMessageText(message)}</p>
                  <time dateTime={message.createdAt || ''}>
                    {message.createdAt
                      ? new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '--:--'}
                  </time>
                </article>
              );
            })
          : null}
      </section>

      <form className="chat-composer" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入消息内容"
        />
        <button className="primary-button composer-button" type="submit" disabled={sending}>
          {sending ? '发送中...' : '发送'}
        </button>
      </form>
    </section>
  );
}
