import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MainShell from './MainShell';

vi.mock('../api/chat', () => ({
  listConversations: vi.fn().mockResolvedValue([
    {
      id: 'conversation-1',
      type: 'DM',
      title: '商务对接',
      lastMessage: '你好，这里是最新消息',
      updatedAt: '2026-07-30T12:00:00.000Z'
    }
  ])
}));

describe('MainShell', () => {
  it('renders shortcuts and conversation rows', async () => {
    render(
      <MemoryRouter>
        <MainShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('消息');
    expect(screen.getByRole('link', { name: '系统通知 查看公告与风控结果' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /商务对接/ })).toHaveAttribute(
      'href',
      '/h5/chat/conversation-1'
    );
  });
});
