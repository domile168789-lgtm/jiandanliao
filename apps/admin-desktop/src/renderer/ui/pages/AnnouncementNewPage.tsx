import React, { useEffect, useState } from 'react';
import { loadSession } from '../../api/client';
import { createAnnouncement, getAnnouncements, type Announcement } from '../../api/admin';

export const AnnouncementNewPage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const session = loadSession();
  const canWrite = session?.role === 'SUPER_ADMIN' || session?.role === 'OPERATOR';

  const loadAnnouncements = async () => {
    setListLoading(true);
    try {
      setAnnouncements(await getAnnouncements());
    } catch {
      setAnnouncements([]);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

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
      await loadAnnouncements();
      setFeedback({
        tone: 'ok',
        message: '已发布。公告已落库并刷新下方列表，同时服务端会尝试同步到用户端系统会话供 /h5/messages 展示。'
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
        数据来源：当前页面会调用真实后台接口 `/api/admin/announcements` 创建并回读公告列表。发布成功后，服务端会把公告落库，并尝试同步到用户端系统会话。
      </div>
      <button onClick={submit} disabled={!title.trim() || !content.trim() || loading || !canWrite}>
        {loading ? '发布中…' : '发布'}
      </button>
      {feedback ? <div className={feedback.tone}>{feedback.message}</div> : null}

      <div className="toolbar" style={{ marginTop: 24 }}>
        <h3>最近公告</h3>
        <button type="button" onClick={() => void loadAnnouncements()} disabled={listLoading}>
          {listLoading ? '刷新中…' : '刷新列表'}
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>标题</th>
            <th>内容</th>
            <th>状态</th>
            <th>创建人</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.content}</td>
              <td>{item.status}</td>
              <td className="mono">{item.createdBy}</td>
              <td className="mono">{item.createdAt}</td>
            </tr>
          ))}
          {!announcements.length && (
            <tr>
              <td colSpan={5} className="muted">
                暂无公告数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
