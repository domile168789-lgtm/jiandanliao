import React, { useState } from 'react';
import { loadSession } from '../../api/client';
import { createAnnouncement } from '../../api/admin';

export const AnnouncementNewPage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const session = loadSession();
  const canWrite = session?.role === 'SUPER_ADMIN' || session?.role === 'OPERATOR';

  const submit = async () => {
    if (!canWrite) {
      setFeedback({ tone: 'error', message: '当前角色无公告发布权限。' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await createAnnouncement({ title, content });
      setTitle('');
      setContent('');
      setFeedback({
        tone: 'ok',
        message: '已发布。公告会写入后台公告表，并尝试进入用户端系统会话供 /h5/messages 展示。'
      });
    } catch (e: any) {
      setFeedback({ tone: 'error', message: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>发布公告</h2>
      <label>
        标题
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        内容
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
      </label>
      <div className="data-source-note">
        数据来源：当前页面提交真实后台接口 `/api/admin/announcements`。发布成功后，服务端会把公告落库，并尝试同步到用户端系统会话。
      </div>
      <button onClick={submit} disabled={!title.trim() || !content.trim() || loading || !canWrite}>
        {loading ? '发布中…' : '发布'}
      </button>
      {feedback ? <div className={feedback.tone}>{feedback.message}</div> : null}
    </div>
  );
};
