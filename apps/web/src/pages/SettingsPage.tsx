import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAccessToken } from '../state/session';

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>设置</h1>
          <p>账号、语言与安全策略统一在这里管理。</p>
        </div>
        <Link className="mini-link" to="/h5/me">
          返回我的
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="list-stack">
          <Link className="list-link" to="/h5/profile">
            编辑个人资料
          </Link>
          <Link className="list-link" to="/h5/security">
            管理安全设置
          </Link>
          <Link className="list-link" to="/h5/system-notice">
            查看系统通知
          </Link>
        </section>
        <button
          className="text-button settings-action"
          type="button"
          onClick={() => {
            clearAccessToken();
            navigate('/h5/login');
          }}
        >
          退出登录
        </button>
      </div>
    </section>
  );
}
