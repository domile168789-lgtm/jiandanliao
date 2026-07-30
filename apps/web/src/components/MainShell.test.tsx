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
    expect(screen.getByRole('button', { name: '打开快捷菜单' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /商务对接/ })).toHaveAttribute(
      'href',
      '/h5/chat/conversation-1'
    );
  });

  it('opens the plus menu and exposes 发起群聊', async () => {
    render(
      <MemoryRouter>
        <MainShell />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '打开快捷菜单' }));
    expect(await screen.findByRole('link', { name: '发起群聊' })).toHaveAttribute('href', '/h5/group/new');

    fireEvent.click(screen.getByRole('button', { name: '打开快捷菜单' }));
    expect(screen.queryByRole('link', { name: '发起群聊' })).not.toBeInTheDocument();
  });
});
