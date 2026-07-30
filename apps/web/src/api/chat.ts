import { apiGet, apiPost } from './client';
import { withDemoFallback, type LoadableData } from './loadable';

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

const fallbackConversations: ConversationRow[] = [
  {
    id: 'demo-system',
    type: 'SYSTEM',
    title: '系统通知',
    lastMessage: '当前为演示会话列表，真实会话恢复后会自动切回。',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-service',
    type: 'DM',
    title: '演示客服',
    lastMessage: '可继续浏览页面结构，但当前不是实时会话数据。',
    updatedAt: new Date().toISOString()
  }
];

export const getFallbackMessages = (conversationId: string): MessageRow[] => [
  {
    id: `${conversationId}-system`,
    conversationId,
    senderId: null,
    type: 'SYSTEM',
    body: { text: '欢迎进入当前会话，当前展示的是演示消息数据。' },
    createdAt: new Date().toISOString()
  },
  {
    id: `${conversationId}-welcome`,
    conversationId,
    senderId: 'peer',
    type: 'TEXT',
    body: { text: '你好，这里是完整版 H5 聊天页入口。' },
    createdAt: new Date().toISOString()
  }
];

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

export async function loadConversations(fetcher: typeof fetch = fetch): Promise<LoadableData<ConversationRow[]>> {
  return withDemoFallback(
    () => listConversations(fetcher),
    fallbackConversations,
    '会话列表接口暂不可用，当前展示演示会话。'
  );
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

export async function loadMessages(
  conversationId: string,
  fetcher: typeof fetch = fetch
): Promise<LoadableData<MessageRow[]>> {
  return withDemoFallback(
    () => listMessages(conversationId, fetcher),
    getFallbackMessages(conversationId),
    '消息接口暂不可用，当前展示演示消息。'
  );
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
