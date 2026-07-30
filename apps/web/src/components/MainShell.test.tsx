import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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
  it('renders compose entry and conversation rows', async () => {
    render(
      <MemoryRouter>
        <MainShell />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('消息');
    expect(screen.getByRole('link', { name: '发起单聊' })).toHaveAttribute('href', '/h5/contacts');
    expect(await screen.findByRole('link', { name: /商务对接/ })).toHaveAttribute(
      'href',
      '/h5/chat/conversation-1'
    );
  });
});
