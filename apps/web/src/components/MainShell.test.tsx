import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MainShell from './MainShell';

vi.mock('../api/chat', () => ({
  subscribePreviewImUpdates: vi.fn(() => () => undefined),
  loadConversations: vi.fn().mockResolvedValue({
    data: [
      {
        id: 'conversation-1',
        type: 'DM',
        title: '商务对接',
        lastMessage: '你好，这里是最新消息',
        updatedAt: '2026-07-30T12:00:00.000Z'
      }
    ],
    source: 'live'
  })
}));

describe('MainShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders plus entry and conversation rows', async () => {
    render(
      <MemoryRouter>
        <MainShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('消息');
    expect(screen.queryByText('系统会话、单聊与群聊入口统一收口到这里。')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开快捷菜单' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /商务对接/ })).toHaveAttribute(
      'href',
      '/h5/chat/conversation-1'
    );
  });

  it('shows all plus menu entries', async () => {
    render(
      <MemoryRouter>
        <MainShell />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '打开快捷菜单' }));
    expect(await screen.findByRole('link', { name: '发起群聊' })).toHaveAttribute('href', '/h5/group/new');
    expect(screen.getByRole('link', { name: '添加朋友' })).toHaveAttribute('href', '/h5/contacts/friends');
    expect(screen.getByRole('link', { name: '扫一扫' })).toHaveAttribute('href', '/h5/discover/scan');
    expect(screen.getByRole('link', { name: '收付款' })).toHaveAttribute('href', '/h5/wallet');

    fireEvent.click(screen.getByRole('button', { name: '打开快捷菜单' }));
    expect(screen.queryByRole('link', { name: '发起群聊' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '添加朋友' })).not.toBeInTheDocument();
  });
});
