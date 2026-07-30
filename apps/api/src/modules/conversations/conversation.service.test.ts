import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn()
}));

vi.mock('../../db', () => ({
  getDb: () => ({
    execute: executeMock
  })
}));

import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'mysql://root:root@mysql:3306/jianliao';
  });

  it('returns empty list when phone has no conversations', async () => {
    executeMock.mockResolvedValueOnce([[]]);
    const service = new ConversationService();

    await expect(service.listByPhone('85519999999')).resolves.toEqual([]);
  });

  it('allows conversation member access', async () => {
    executeMock.mockResolvedValueOnce([[{ ok: 1 }]]);
    const service = new ConversationService();

    await expect(service.assertConversationMember('c1', '85510000001')).resolves.toBeUndefined();
  });

  it('rejects non-member conversation access', async () => {
    executeMock.mockResolvedValueOnce([[]]);
    const service = new ConversationService();

    await expect(service.assertConversationMember('c1', '85510000002')).rejects.toThrow(
      'forbidden conversation access'
    );
  });

  it('creates group conversation with owner and members', async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 'u-owner' }]])
      .mockResolvedValueOnce([[{ id: 'u-2' }]])
      .mockResolvedValueOnce([[{ id: 'u-3' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const service = new ConversationService();
    const result = await service.createGroupByPhones({
      ownerPhone: '85510000001',
      title: '项目群',
      memberPhones: ['85510000002', '85510000003']
    });

    expect(result).toMatchObject({
      type: 'GROUP',
      title: '项目群',
      memberCount: 3
    });
    expect(executeMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining(`INSERT INTO conversations`),
      [expect.any(String), '项目群', expect.any(Date)]
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining(`INSERT INTO conversation_members`),
      expect.arrayContaining(['u-owner', 'u-2', 'u-3'])
    );
  });

  it('invites members into existing group as owner', async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 'c1', type: 'GROUP', role: 'OWNER', userId: 'u-owner' }]])
      .mockResolvedValueOnce([[{ id: 'u-2' }]])
      .mockResolvedValueOnce([[{ id: 'u-3' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const service = new ConversationService();
    const result = await service.inviteGroupMembersByPhones({
      conversationId: 'c1',
      operatorPhone: '85510000001',
      memberPhones: ['85510000002', '85510000003']
    });

    expect(result).toEqual({
      id: 'c1',
      invitedCount: 2
    });
    expect(executeMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining(`INSERT IGNORE INTO conversation_members`),
      expect.arrayContaining(['c1', 'u-2', 'c1', 'u-3'])
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining(`UPDATE conversations SET updated_at = ? WHERE id = ?`),
      [expect.any(Date), 'c1']
    );
  });

  it('allows group member to leave group', async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 'c1', type: 'GROUP', role: 'MEMBER', userId: 'u-2' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const service = new ConversationService();
    const result = await service.leaveGroupByPhone({
      conversationId: 'c1',
      phone: '85510000002'
    });

    expect(result).toEqual({
      id: 'c1',
      left: true
    });
    expect(executeMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`DELETE FROM conversation_members`),
      ['c1', 'u-2']
    );
    expect(executeMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(`UPDATE conversations SET updated_at = ? WHERE id = ?`),
      [expect.any(Date), 'c1']
    );
  });
});
