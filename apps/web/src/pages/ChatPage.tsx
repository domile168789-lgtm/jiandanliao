import React from 'react';
import { Link, useParams } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import {
  loadMessages,
  subscribePreviewImUpdates,
  sendTextMessage,
  type MessageRow
} from '../api/chat';
import { getErrorMessage } from '../api/loadable';

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
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const refresh = React.useCallback(
    async (cancelledRef?: { current: boolean }, nextLoading = false) => {
      if (nextLoading && !cancelledRef?.current) {
        setLoading(true);
      }
      try {
        const result = await loadMessages(conversationId);
        if (cancelledRef?.current) return;
        setMessages(result.data);
        setNoticeMessage(result.notice || null);
        setErrorMessage(null);
      } catch (error) {
        if (cancelledRef?.current) return;
        setMessages([]);
        setErrorMessage(getErrorMessage(error, '消息加载失败，请重新登录后重试'));
      } finally {
        if (cancelledRef?.current) return;
        setLoading(false);
      }
    },
    [conversationId]
  );

  React.useEffect(() => {
    const cancelled = { current: false };
    void refresh(cancelled, true);

    const unsubscribe = subscribePreviewImUpdates(() => {
      void refresh();
    });

    return () => {
      cancelled.current = true;
      unsubscribe();
    };
  }, [refresh]);

  const conversationTitle = React.useMemo(() => {
    const latestSystem = messages.find((item) => item.type === 'SYSTEM');
    if (conversationId === 'demo-system') return '系统通知';
    if (conversationId === 'demo-business') return '商务对接';
    if (conversationId === 'demo-agency') return '渠道伙伴群';
    if (conversationId === 'demo-security') return '安全专员';
    if (conversationId.startsWith('contact-')) return '单聊会话';
    if (latestSystem && typeof latestSystem.body.title === 'string') return latestSystem.body.title;
    return '聊天';
  }, [conversationId, messages]);

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
    setErrorMessage(null);

    try {
      const created = await sendTextMessage(conversationId, nextDraft);
      if (created) {
        setMessages((current) => {
          const nextMessages = current.filter((item) => item.id !== optimisticMessage.id);
          if (nextMessages.some((item) => item.id === created.id)) {
            return nextMessages;
          }
          return [...nextMessages, created];
        });
      }
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      setDraft(nextDraft);
      setErrorMessage(getErrorMessage(error, '发送失败，请稍后重试'));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="h5-page chat-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>{conversationTitle}</h1>
          <p>会话 ID：{conversationId}</p>
        </div>
        <Link className="mini-link" to="/h5/messages">
          返回消息
        </Link>
      </header>

      <section className="chat-feed" aria-label="聊天消息">
        {loading ? <p className="conversation-state">消息加载中...</p> : null}
        {!loading && errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {!loading && noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        {!loading && !errorMessage && messages.length === 0 ? <p className="conversation-state">暂无消息</p> : null}
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
          placeholder="输入消息内容，发送后会自动刷新会话列表"
        />
        <button className="primary-button composer-button" type="submit" disabled={sending}>
          {sending ? '发送中...' : '发送'}
        </button>
      </form>
    </section>
  );
}
