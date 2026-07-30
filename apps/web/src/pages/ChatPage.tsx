import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import {
  loadMessages,
  markConversationRead,
  sendAudioMessage,
  sendImageMessage,
  subscribeRealtimeMessages,
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

const getMediaUrl = (row: MessageRow) => {
  const candidate =
    (typeof row.body.url === 'string' && row.body.url) ||
    (typeof row.body.objectKey === 'string' && row.body.objectKey) ||
    '';
  if (!candidate) return '';
  if (candidate.startsWith('blob:') || candidate.startsWith('data:') || candidate.startsWith('http')) return candidate;
  if (candidate.startsWith('/')) return candidate;
  return `/${candidate.replace(/^\/+/, '')}`;
};

const renderMessageBody = (row: MessageRow) => {
  if (row.type === 'IMAGE') {
    const src = getMediaUrl(row);
    return src ? <img className="chat-media-image" src={src} alt="图片消息" /> : <p>[图片消息]</p>;
  }

  if (row.type === 'AUDIO') {
    const src = getMediaUrl(row);
    const durationMs = typeof row.body.durationMs === 'number' ? row.body.durationMs : Number(row.body.durationMs || 0);
    return (
      <div className="chat-audio-card">
        {src ? <audio controls preload="metadata" src={src} /> : <p>[语音消息]</p>}
        {durationMs > 0 ? <span>{Math.max(1, Math.round(durationMs / 1000))} 秒</span> : null}
      </div>
    );
  }

  return <p>{getMessageText(row)}</p>;
};

export default function ChatPage() {
  const { conversationId = 'demo-conversation' } = useParams();
  const location = useLocation();
  const locationState = location.state as
    | { conversationTitle?: string; conversationType?: string }
    | null;
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [mediaSending, setMediaSending] = React.useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const syncReadState = React.useCallback(async () => {
    try {
      await markConversationRead(conversationId);
    } catch {
      // ignore best-effort read acknowledgement
    }
  }, [conversationId]);

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

  React.useEffect(() => {
    void syncReadState();
  }, [syncReadState]);

  React.useEffect(() => {
    const unsubscribe = subscribeRealtimeMessages(
      () => {
        void refresh().then(() => syncReadState());
      },
      { conversationIds: [conversationId] }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId, refresh, syncReadState]);

  const conversationTitle = React.useMemo(() => {
    const locationTitle = locationState?.conversationTitle;
    const latestSystem = messages.find((item) => item.type === 'SYSTEM');
    if (conversationId === 'demo-system') return '系统通知';
    if (conversationId === 'demo-business') return '商务对接';
    if (conversationId === 'demo-agency') return '渠道伙伴群';
    if (conversationId === 'demo-security') return '安全专员';
    if (conversationId === 'preview-system') return '系统通知';
    if (conversationId === 'preview-dm-business') return '商务对接';
    if (conversationId === 'preview-group-agency') return '渠道伙伴群';
    if (conversationId === 'preview-dm-security') return '安全专员';
    if (conversationId.startsWith('contact-')) return '单聊会话';
    if (latestSystem && typeof latestSystem.body.title === 'string') return latestSystem.body.title;
    if (typeof locationTitle === 'string' && locationTitle.trim()) return locationTitle.trim();
    return '聊天';
  }, [conversationId, locationState, messages]);

  const isGroupConversation =
    locationState?.conversationType === 'GROUP' ||
    conversationId === 'demo-agency' ||
    conversationId === 'preview-group-agency' ||
    conversationId.startsWith('preview-group-');

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
        await refresh();
        await syncReadState();
      }
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== optimisticMessage.id));
      setDraft(nextDraft);
      setErrorMessage(getErrorMessage(error, '发送失败，请稍后重试'));
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = React.useCallback(
    async (file: File, type: 'IMAGE' | 'AUDIO') => {
      const optimisticId = `${type.toLowerCase()}-${Date.now()}`;
      const objectUrl =
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : `${type.toLowerCase()}/${file.name}`;
      const optimisticBody =
        type === 'IMAGE'
          ? { objectKey: objectUrl, url: objectUrl, mimeType: file.type, filename: file.name }
          : {
              objectKey: objectUrl,
              url: objectUrl,
              mimeType: file.type || 'audio/aac',
              filename: file.name,
              durationMs: 1_000
            };
      const optimisticMessage: MessageRow = {
        id: optimisticId,
        conversationId,
        senderId: 'self',
        type,
        body: optimisticBody,
        status: 'SENT',
        createdAt: new Date().toISOString()
      };

      setMessages((current) => [...current, optimisticMessage]);
      setMediaSending(type === 'IMAGE' ? '图片发送中...' : '语音发送中...');
      setErrorMessage(null);

      try {
        const created =
          type === 'IMAGE'
            ? await sendImageMessage(conversationId, file)
            : await sendAudioMessage(conversationId, file);
        setMessages((current) => {
          const nextMessages = current.filter((item) => item.id !== optimisticId);
          if (created && !nextMessages.some((item) => item.id === created.id)) {
            nextMessages.push(created);
          }
          return nextMessages;
        });
        await refresh();
        await syncReadState();
      } catch (error) {
        setMessages((current) => current.filter((item) => item.id !== optimisticId));
        setErrorMessage(getErrorMessage(error, type === 'IMAGE' ? '图片发送失败，请稍后重试' : '语音发送失败，请稍后重试'));
      } finally {
        setMediaSending(null);
        if (objectUrl.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(objectUrl);
        }
      }
    },
    [conversationId, refresh, syncReadState]
  );

  return (
    <section className="h5-page chat-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>{conversationTitle}</h1>
          <p>会话 ID：{conversationId}</p>
        </div>
        <div className="chat-header-actions">
          {isGroupConversation ? (
            <Link
              className="mini-link"
              to={`/h5/chat/${conversationId}/settings`}
              state={{ conversationTitle, conversationType: 'GROUP' }}
            >
              群设置
            </Link>
          ) : null}
          <Link className="mini-link" to="/h5/messages">
            返回消息
          </Link>
        </div>
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
                  {renderMessageBody(message)}
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
        <div className="chat-composer-main">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="输入消息内容，发送后会自动刷新会话列表"
          />
          <div className="composer-tools" aria-label="聊天扩展操作">
            <label className="composer-tool" htmlFor="chat-image-upload">
              图片
            </label>
            <input
              id="chat-image-upload"
              aria-label="发送图片"
              className="composer-file-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleSendMedia(file, 'IMAGE');
                }
                event.currentTarget.value = '';
              }}
            />

            <label className="composer-tool" htmlFor="chat-audio-upload">
              语音
            </label>
            <input
              id="chat-audio-upload"
              aria-label="发送语音"
              className="composer-file-input"
              type="file"
              accept="audio/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleSendMedia(file, 'AUDIO');
                }
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>
        <button className="primary-button composer-button" type="submit" disabled={sending || Boolean(mediaSending)}>
          {mediaSending || (sending ? '发送中...' : '发送')}
        </button>
      </form>
    </section>
  );
}
