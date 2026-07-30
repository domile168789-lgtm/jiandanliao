import React, { useEffect, useState } from 'react';
import { loadSession } from '../../api/client';
import { banUser, getUsers, type AdminUser } from '../../api/admin';

export const UsersPage = () => {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const session = loadSession();
  const canWrite = session?.role === 'SUPER_ADMIN' || session?.role === 'OPERATOR';

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setData(await getUsers());
    } catch (e: any) {
      setErr(`用户管理接口请求失败：${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onBan = async (id: string) => {
    if (!canWrite) return;
    setBanLoadingId(id);
    setErr(null);
    try {
      await banUser(id);
      await load();
    } catch (e: any) {
      setErr(`用户封禁失败：${String(e?.message || e)}`);
    } finally {
      setBanLoadingId(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h2>用户</h2>
        <button onClick={load} disabled={loading}>
          刷新
        </button>
      </div>
      {err && <div className="error">{err}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>手机号</th>
            <th>昵称</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id}>
              <td className="mono">{u.id}</td>
              <td className="mono">{u.phone}</td>
              <td>{u.nickname}</td>
              <td>{u.status}</td>
              <td className="mono">{u.updatedAt}</td>
              <td>
                {canWrite ? (
                  <button onClick={() => onBan(u.id)} disabled={u.status === 'BANNED' || banLoadingId === u.id}>
                    {banLoadingId === u.id ? '封禁中…' : '封禁'}
                  </button>
                ) : (
                  <span className="muted">只读</span>
                )}
              </td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={6} className="muted">
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
