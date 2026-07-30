import React, { useState } from 'react';
import { ApiError, type AdminSession } from '../../api/client';
import { request } from '../../api/client';

export const LoginPage = (props: { onLogin: (s: AdminSession) => void }) => {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('change-me-superadmin');
  const [baseUrl, setBaseUrl] = useState('/api');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextBaseUrl = baseUrl.trim() || '/api';
      const response = await request<{
        accessToken: string;
        admin: Pick<AdminSession, 'id' | 'role' | 'username'>;
      }>('/admin/login', {
        method: 'POST',
        baseUrl: nextBaseUrl,
        auth: false,
        body: {
          username: username.trim(),
          password
        }
      });
      props.onLogin({
        ...response.admin,
        accessToken: response.accessToken,
        baseUrl: nextBaseUrl
      });
    } catch (err) {
      if (err instanceof ApiError) setError(`${err.code || '请求失败'} (${err.status})`);
      else setError((err as Error).message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>后台登录（阶段 1）</h2>
      <p className="muted">当前默认连接真实后台接口，并通过 Bearer Token 识别管理员身份。</p>

      <label>
        管理员用户名
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="superadmin" />
      </label>

      <label>
        密码
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入管理员密码"
        />
      </label>

      <label>
        API Base URL
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="/api 或 http://127.0.0.1:3001/api"
        />
      </label>

      <p className="muted">浏览器预览默认走 `/api` 代理；打包后的 Windows 端默认直连线上接口。</p>
      {error ? <div className="error">{error}</div> : null}

      <button disabled={loading || !username.trim() || !password.trim()}>
        {loading ? '连接中…' : '进入后台'}
      </button>
    </form>
  );
};
