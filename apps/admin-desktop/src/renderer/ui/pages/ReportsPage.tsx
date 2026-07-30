import React, { useEffect, useState } from 'react';
import { loadSession } from '../../api/client';
import { getReports, resolveReport, type Report } from '../../api/admin';

export const ReportsPage = () => {
  const [data, setData] = useState<Report[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const session = loadSession();
  const canWrite = session?.role === 'SUPER_ADMIN' || session?.role === 'OPERATOR';

  const load = async () => {
    setErr(null);
    try {
      setData(await getReports());
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onResolve = async (id: string) => {
    if (!canWrite) return;
    setResolvingId(id);
    setErr(null);
    try {
      await resolveReport(id);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h2>举报</h2>
        <button onClick={load}>刷新</button>
      </div>
      {err && <div className="error">{err}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>举报人</th>
            <th>目标</th>
            <th>原因</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.id}</td>
              <td className="mono">{r.reporterUserId}</td>
              <td className="mono">
                {r.targetType}:{r.targetId}
              </td>
              <td>{r.reason}</td>
              <td>{r.status}</td>
              <td className="mono">{r.createdAt}</td>
              <td>
                {canWrite ? (
                  <button
                    onClick={() => onResolve(r.id)}
                    disabled={r.status === 'CLOSED' || resolvingId === r.id}
                  >
                    {resolvingId === r.id ? '处理中…' : r.status === 'CLOSED' ? '已关闭' : '关闭举报'}
                  </button>
                ) : (
                  <span className="muted">只读</span>
                )}
              </td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={7} className="muted">
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
