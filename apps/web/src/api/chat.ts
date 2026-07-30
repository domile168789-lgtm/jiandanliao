import { apiGet, apiPost } from './client';

export type ConversationRow = {
  id: string;
  type: string;
  title: string | null;
  lastMessage: string | null;
  updatedAt: string | null;
};

export type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string | null;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
  body: Record<string, unknown>;
  createdAt: string | null;
};

const normalizeConversation = (payload: unknown): ConversationRow | null => {
  if (!payload || typeof payload !== 'object') return null;

  const row = payload as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const type = typeof row.type === 'string' ? row.type : 'UNKNOWN';

  if (!id) return null;

  return {
    id,
    type,
    title: typeof row.title === 'string' ? row.title : null,
    lastMessage: typeof row.lastMessage === 'string' ? row.lastMessage : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null
  };
};

const normalizeMessage = (payload: unknown): MessageRow | null => {
  if (!payload || typeof payload !== 'object') return null;

  const row = payload as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const conversationId = typeof row.conversationId === 'string' ? row.conversationId : '';
  if (!id || !conversationId) return null;

  return {
    id,
    conversationId,
    senderId: typeof row.senderId === 'string' ? row.senderId : null,
    type:
      row.type === 'IMAGE' ||
      row.type === 'FILE' ||
      row.type === 'AUDIO' ||
      row.type === 'VIDEO' ||
      row.type === 'SYSTEM'
        ? row.type
        : 'TEXT',
    body: row.body && typeof row.body === 'object' ? (row.body as Record<string, unknown>) : {},
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null
  };
};

export function buildFallbackConversationId(phone: string) {
  return `contact-${phone.replace(/\D/g, '') || 'demo'}`;
}

export async function listConversations(fetcher: typeof fetch = fetch): Promise<ConversationRow[]> {
  const payload = await apiGet<unknown>('/api/conversations', fetcher);

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => normalizeConversation(item))
    .filter((item): item is ConversationRow => item !== null);
}

export async function listMessages(
  conversationId: string,
  fetcher: typeof fetch = fetch
): Promise<MessageRow[]> {
  const payload = await apiGet<unknown>(
    `/api/messages?conversationId=${encodeURIComponent(conversationId)}`,
    fetcher
  );

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => normalizeMessage(item))
    .filter((item): item is MessageRow => item !== null)
    .reverse();
}

export async function sendTextMessage(
  conversationId: string,
  text: string,
  fetcher: typeof fetch = fetch
): Promise<MessageRow | null> {
  const payload = await apiPost<unknown>(
    '/api/messages',
    {
      conversationId,
      type: 'TEXT',
      body: { text }
    },
    fetcher
  );

  return normalizeMessage(payload);
}

export async function createDirectConversation(
  peerPhone: string,
  fetcher: typeof fetch = fetch
): Promise<ConversationRow | null> {
  const payload = await apiPost<unknown>(
    '/api/conversations/dm',
    {
      peerPhone
    },
    fetcher
  );

  return normalizeConversation(payload);
}
