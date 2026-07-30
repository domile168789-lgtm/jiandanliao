import React, { useEffect, useState } from 'react';
import { getAuditActions, type AuditAction } from '../../api/admin';

export const AuditActionsPage = () => {
  const [data, setData] = useState<AuditAction[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      setData(await getAuditActions());
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <div className="toolbar">
        <h2>审计</h2>
        <button onClick={load}>刷新</button>
      </div>
      {err && <div className="error">{err}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>管理员</th>
            <th>动作</th>
            <th>目标</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.id}</td>
              <td className="mono">{a.adminId}</td>
              <td>{a.action}</td>
              <td className="mono">
                {a.targetType}:{a.targetId}
              </td>
              <td className="mono">{a.createdAt}</td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={5} className="muted">
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

