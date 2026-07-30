import { describe, expect, it } from 'vitest';
import { buildServerEvent } from './events';

describe('ws events', () => {
  it('builds typed server event payloads', () => {
    expect(
      buildServerEvent({
        type: 'message_created',
        conversationId: 'c1',
        message: {
          id: 'm1',
          conversationId: 'c1',
          senderId: 'u1',
          type: 'TEXT',
          status: 'SENT',
          body: { text: 'hello' },
          createdAt: '2026-07-30T00:00:00.000Z'
        }
      })
    ).toEqual({
      type: 'message_created',
      conversationId: 'c1',
      message: {
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        type: 'TEXT',
        status: 'SENT',
        body: { text: 'hello' },
        createdAt: '2026-07-30T00:00:00.000Z'
      }
    });
  });
});
