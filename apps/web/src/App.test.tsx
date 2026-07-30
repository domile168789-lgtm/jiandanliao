import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const brandingResponse = {
  mobile: {
    platformGroup: 'mobile',
    projectName: '柬聊移动品牌',
    logoUrl: null,
    themeAssetUrl: 'https://assets.jianliao.local/mobile-theme.png',
    holidayThemeAssetUrl: 'https://assets.jianliao.local/mobile-horse-theme.png'
  },
  pc: {
    platformGroup: 'pc',
    projectName: '柬聊 PC 品牌',
    logoUrl: null,
    themeAssetUrl: 'https://assets.jianliao.local/pc-theme.png',
    holidayThemeAssetUrl: null
  }
};

describe('App route entry', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/conversations')) {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }

        if (url.includes('/api/messages')) {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }

        const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;

        return Promise.resolve({
          ok: true,
          json: async () => row
        });
      })
    );
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  const renderAt = (path: string, options?: { token?: string }) => {
    if (options?.token) {
      window.localStorage.setItem('jianliao_access_token', options.token);
    }

    return render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    );
  };

  it('redirects unauthenticated /h5/messages to login and allows switching to register then back', async () => {
    renderAt('/h5/messages');
    expect(await screen.findByText('柬聊移动品牌')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册账号' })).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '顶部品牌区' })).toHaveTextContent('柬聊移动品牌');
    expect(screen.getByRole('region', { name: '中部登录区' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: '底部辅助区' })).toBeInTheDocument();
    expect(screen.getByLabelText('账号')).toHaveAttribute('placeholder', '请输入账号');
    expect(screen.getByRole('button', { name: '记住密码' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全球语言切换' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '注册账号' }));

    expect(screen.getByRole('button', { name: '注册并进入' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已有账号？去登录' })).toBeInTheDocument();
    expect(screen.getByLabelText('昵称')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '已有账号？去登录' }));

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.queryByLabelText('昵称')).not.toBeInTheDocument();
  });

  it('renders protected tab routes with token and allows tab navigation', async () => {
    renderAt('/h5/messages', { token: 'demo-token' });

    expect(await screen.findByRole('heading', { level: 1, name: '消息' })).toBeInTheDocument();
    expect(screen.getByText('暂无会话')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '通讯录' }));
    expect(await screen.findByRole('heading', { level: 1, name: '通讯录' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '发现' }));
    expect(await screen.findByRole('heading', { level: 1, name: '发现' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '我的' }));
    expect(await screen.findByRole('heading', { level: 1, name: '我的' })).toBeInTheDocument();
  });

  it('renders all extended client sections when authenticated', async () => {
    renderAt('/h5/system-notice', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '系统通知' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/wallet', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '钱包' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/earnings', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '收益' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/agent', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '代理中心' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/profile', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '个人资料' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/security', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '安全中心' })).toBeInTheDocument();
  });

  it('maps /mobile to mobile branding and /PC to pc branding', async () => {
    renderAt('/mobile');

    expect(await screen.findByText('柬聊移动品牌')).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '顶部品牌区' })).toHaveTextContent('柬聊移动品牌');

    cleanup();
    renderAt('/PC');

    expect(await screen.findByText('柬聊 PC 品牌')).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '顶部品牌区' })).toHaveTextContent('柬聊 PC 品牌');
  });

  it('renders login page by default on root path', async () => {
    renderAt('/');

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(await screen.findByText('柬聊 PC 品牌')).toBeInTheDocument();
  });

  it('renders download page on /app', () => {
    renderAt('/app');
    expect(screen.getByText('柬单聊下载')).toBeInTheDocument();
    expect(screen.getByText('下载安装 Android 版')).toBeInTheDocument();
  });
});
