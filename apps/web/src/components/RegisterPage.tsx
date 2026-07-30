import React, { useState } from 'react';
import type { BrandingPlatformGroup, BrandingRow } from '../api/branding';

type RegisterPageProps = {
  brand: BrandingRow;
  platformGroup: BrandingPlatformGroup;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onEnter: (input: { account: string; password: string; nickname: string }) => void | Promise<void>;
  onSwitchToLogin: () => void;
};

export default function RegisterPage({
  brand,
  platformGroup,
  isSubmitting = false,
  errorMessage = null,
  onEnter,
  onSwitchToLogin
}: RegisterPageProps) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const isPc = platformGroup === 'pc';
  const brandCardBackground = brand.holidayThemeAssetUrl || brand.themeAssetUrl;

  return (
    <main className={`auth-shell ${isPc ? 'is-pc' : 'is-mobile'}`}>
      <section className="auth-card">
        <div
          className="brand-card brand-card-dark"
          aria-label="品牌卡片"
          style={
            brandCardBackground
              ? {
                  backgroundImage: `linear-gradient(135deg, rgba(11, 19, 40, 0.94), rgba(17, 28, 63, 0.92)), url(${brandCardBackground})`
                }
              : undefined
          }
        >
          <div className="brand-mark brand-mark-compact" aria-hidden="true">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt="" />
            ) : (
              <span>{isPc ? 'PC' : 'M'}</span>
            )}
          </div>
          <div className="brand-card-copy">
            <p className="brand-card-tag">{isPc ? 'PC 网页端品牌卡片' : '移动端品牌卡片'}</p>
            <h1>{brand.projectName}</h1>
            <p>创建账号并进入</p>
          </div>
        </div>

        <div className="auth-form-head">
          <h2>创建账号</h2>
          <p>先完成基础账号注册，手机号绑定放到进入应用后再由你自行选择。</p>
        </div>

        <div className="auth-form-grid">
          <label className="auth-field">
            <span>账号</span>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
            />
          </label>

          <label className="auth-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请设置密码"
              autoComplete="new-password"
            />
          </label>

          <label className="auth-field">
            <span>昵称</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
              autoComplete="nickname"
            />
          </label>
        </div>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <button
          className="primary-button"
          type="button"
          disabled={isSubmitting}
          onClick={() => onEnter({ account: account.trim(), password, nickname: nickname.trim() })}
        >
          {isSubmitting ? '注册中...' : '注册并进入'}
        </button>

        <button className="text-button" type="button" onClick={onSwitchToLogin}>
          已有账号？去登录
        </button>

        <button className="language-button" type="button">
          全球语言切换
        </button>
      </section>
    </main>
  );
}
