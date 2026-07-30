import React, { useState } from 'react';
import type { BrandingPlatformGroup, BrandingRow } from '../api/branding';

type AuthPageProps = {
  brand: BrandingRow;
  platformGroup: BrandingPlatformGroup;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  noticeMessage?: string | null;
  onEnter: (input: { account: string; password: string }) => void | Promise<void>;
  onSwitchToRegister: () => void;
};

export default function AuthPage({
  brand,
  platformGroup,
  isSubmitting = false,
  errorMessage = null,
  noticeMessage = null,
  onEnter,
  onSwitchToRegister
}: AuthPageProps) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(true);
  const isPc = platformGroup === 'pc';
  const themeBackgroundUrl = brand.holidayThemeAssetUrl || brand.themeAssetUrl;
  const authShellStyle = {
    ['--horse-theme-image' as '--horse-theme-image']: themeBackgroundUrl
      ? `url("${themeBackgroundUrl}")`
      : 'none'
  } as React.CSSProperties;

  return (
    <main
      className={`auth-shell horse-theme ${isPc ? 'is-pc' : 'is-mobile'}`}
      style={authShellStyle}
    >
      <section className="auth-card">
        <header className="horse-brand-zone" aria-label="顶部品牌区">
          <div className="horse-brand-mark" aria-hidden="true">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt="" />
            ) : (
              <span>{isPc ? 'PC' : 'M'}</span>
            )}
          </div>
          <h1>{brand.projectName}</h1>
        </header>

        <section className="horse-form-zone" aria-label="中部登录区">
          <label className="horse-field">
            <span>账号</span>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
            />
          </label>

          <label className="horse-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
          {noticeMessage ? <p className="form-notice">{noticeMessage}</p> : null}

          <button
            className="primary-button horse-login-button"
            type="button"
            disabled={isSubmitting}
            onClick={() => onEnter({ account: account.trim(), password })}
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </section>

        <footer className="horse-footer-zone" aria-label="底部辅助区">
          <button
            className={`horse-footer-link helper-toggle ${rememberPassword ? 'is-active' : ''}`}
            type="button"
            onClick={() => setRememberPassword((value) => !value)}
          >
            记住密码
          </button>

          <button
            className="horse-footer-link text-button"
            type="button"
            onClick={onSwitchToRegister}
          >
            注册账号
          </button>

          <button className="horse-footer-link language-button" type="button">
            全球语言切换
          </button>
        </footer>
      </section>
    </main>
  );
}
