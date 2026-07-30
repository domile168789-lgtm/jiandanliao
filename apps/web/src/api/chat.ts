import { getAccessToken } from '../state/session';
import { apiGet, apiPost } from './client';
import { withDemoFallback, type DataSource, type LoadableData } from './loadable';

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

const PREVIEW_QUERY_KEY = 'preview';
const PREVIEW_QUERY_VALUE = 'demo';
const PREVIEW_ACCESS_TOKEN = 'preview-demo-token';
const PREVIEW_STORAGE_KEY = 'jiandanliao_preview_im_v1';
const PREVIEW_UPDATE_EVENT = 'jiandanliao:preview-im-updated';

type PreviewContact = {
  phone: string;
  title: string;
  type: 'SYSTEM' | 'DM' | 'GROUP';
};

type PreviewStore = {
  conversations: ConversationRow[];
  messages: Record<string, MessageRow[]>;
};

const previewContacts: PreviewContact[] = [
  { phone: '855010100001', title: '系统通知', type: 'SYSTEM' },
  { phone: '855010100002', title: '商务对接', type: 'DM' },
  { phone: '855010100003', title: '渠道伙伴群', type: 'GROUP' },
  { phone: '855010100004', title: '安全专员', type: 'DM' }
];

const buildIso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

const previewSeedStore = (): PreviewStore => ({
  conversations: [
    {
      id: 'demo-system',
      type: 'SYSTEM',
      title: '系统通知',
      lastMessage: '后台公告、风控结果和活动发布会统一进入这里。',
      updatedAt: buildIso(5)
    },
    {
      id: 'demo-business',
      type: 'DM',
      title: '商务对接',
      lastMessage: '可以先确认一下今天的投放排期。',
      updatedAt: buildIso(18)
    },
    {
      id: 'demo-agency',
      type: 'GROUP',
      title: '渠道伙伴群',
      lastMessage: '新代理活动今晚 20:00 上线。',
      updatedAt: buildIso(37)
    },
    {
      id: 'demo-security',
      type: 'DM',
      title: '安全专员',
      lastMessage: '你的账号风控巡检已完成，状态正常。',
      updatedAt: buildIso(84)
    }
  ],
  messages: {
    'demo-system': [
      {
        id: 'demo-system-1',
        conversationId: 'demo-system',
        senderId: null,
        type: 'SYSTEM',
        body: { text: '欢迎进入柬单聊 IM 预览环境，这里会展示公告、风控和活动消息。' },
        createdAt: buildIso(30)
      },
      {
        id: 'demo-system-2',
        conversationId: 'demo-system',
        senderId: null,
        type: 'SYSTEM',
        body: { text: '当前浏览器预览支持本地会话流转与消息发送演示。' },
        createdAt: buildIso(5)
      }
    ],
    'demo-business': [
      {
        id: 'demo-business-1',
        conversationId: 'demo-business',
        senderId: 'peer',
        type: 'TEXT',
        body: { text: '你好，这里是商务对接窗口。' },
        createdAt: buildIso(25)
      },
      {
        id: 'demo-business-2',
        conversationId: 'demo-business',
        senderId: 'self',
        type: 'TEXT',
        body: { text: '收到，我这边正在确认今日资源位。' },
        createdAt: buildIso(18)
      }
    ],
    'demo-agency': [
      {
        id: 'demo-agency-1',
        conversationId: 'demo-agency',
        senderId: 'peer',
        type: 'TEXT',
        body: { text: '今晚 20:00 的代理活动物料已经同步。' },
        createdAt: buildIso(42)
      },
      {
        id: 'demo-agency-2',
        conversationId: 'demo-agency',
        senderId: 'peer',
        type: 'TEXT',
        body: { text: '你可以直接在管理后台活动中心确认。' },
        createdAt: buildIso(37)
      }
    ],
    'demo-security': [
      {
        id: 'demo-security-1',
        conversationId: 'demo-security',
        senderId: 'peer',
        type: 'TEXT',
        body: { text: '今日风控巡检结果正常，如遇异常设备登录会第一时间通知你。' },
        createdAt: buildIso(84)
      }
    ]
  }
});

const isPreviewDemoMode = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get(PREVIEW_QUERY_KEY) === PREVIEW_QUERY_VALUE) return true;
  return getAccessToken() === PREVIEW_ACCESS_TOKEN;
};

const dispatchPreviewUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PREVIEW_UPDATE_EVENT));
};

const loadPreviewStore = (): PreviewStore => {
  if (typeof window === 'undefined') {
    return previewSeedStore();
  }

  try {
    const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) {
      const seeded = previewSeedStore();
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = JSON.parse(raw) as PreviewStore | null;
    if (!parsed?.conversations || !parsed?.messages) {
      const seeded = previewSeedStore();
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    return parsed;
  } catch {
    const seeded = previewSeedStore();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(seeded));
    }
    return seeded;
  }
};

const savePreviewStore = (store: PreviewStore) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(store));
  dispatchPreviewUpdate();
};

const getPreviewNotice = (source: DataSource) =>
  source === 'demo'
    ? '当前为本地 IM 演示环境：支持会话切换、发送消息、自动回复和会话列表实时更新。'
    : undefined;

const getMessageText = (message: MessageRow) => {
  if (typeof message.body.text === 'string' && message.body.text.trim()) return message.body.text.trim();
  if (typeof message.body.title === 'string' && message.body.title.trim()) return message.body.title.trim();
  if (message.type === 'SYSTEM') return '系统消息';
  if (message.type === 'IMAGE') return '[图片消息]';
  if (message.type === 'AUDIO') return '[语音消息]';
  if (message.type === 'VIDEO') return '[视频消息]';
  if (message.type === 'FILE') return '[文件消息]';
  return '[新消息]';
};

const sortConversations = (rows: ConversationRow[]) =>
  [...rows].sort((a, b) => `${b.updatedAt || ''}`.localeCompare(`${a.updatedAt || ''}`));

export const subscribePreviewImUpdates = (listener: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => listener();
  window.addEventListener(PREVIEW_UPDATE_EVENT, handler);
  return () => window.removeEventListener(PREVIEW_UPDATE_EVENT, handler);
};

const getPreviewConversationMessages = (conversationId: string) => {
  const store = loadPreviewStore();
  return [...(store.messages[conversationId] || [])].sort((a, b) =>
    `${a.createdAt || ''}`.localeCompare(`${b.createdAt || ''}`)
  );
};

const getPreviewConversationRows = () => {
  const store = loadPreviewStore();
  return sortConversations(store.conversations);
};

const ensurePreviewConversation = (input: { id: string; title: string; type: ConversationRow['type'] }) => {
  const store = loadPreviewStore();
  const existing = store.conversations.find((row) => row.id === input.id);
  if (existing) return existing;

  const nextConversation: ConversationRow = {
    id: input.id,
    title: input.title,
    type: input.type,
    lastMessage: '新会话已创建，可以开始发送消息。',
    updatedAt: new Date().toISOString()
  };

  store.conversations.unshift(nextConversation);
  store.messages[input.id] = [
    {
      id: `${input.id}-welcome`,
      conversationId: input.id,
      senderId: 'peer',
      type: 'TEXT',
      body: { text: `你好，这里是 ${input.title}，当前为本地 IM 演示会话。` },
      createdAt: new Date().toISOString()
    }
  ];
  savePreviewStore(store);
  return nextConversation;
};

const appendPreviewMessage = (conversationId: string, message: MessageRow) => {
  const store = loadPreviewStore();
  const conversation = store.conversations.find((row) => row.id === conversationId);
  if (!conversation) return;

  const currentMessages = store.messages[conversationId] || [];
  store.messages[conversationId] = [...currentMessages, message];
  conversation.lastMessage = getMessageText(message);
  conversation.updatedAt = message.createdAt;
  store.conversations = sortConversations(store.conversations);
  savePreviewStore(store);
};

const schedulePreviewReply = (conversationId: string, text: string) => {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    const replyText =
      text.includes('活动') || text.includes('排期')
        ? '已收到，这条需求我会同步到活动和投放排期里。'
        : text.includes('安全') || text.includes('风控')
          ? '安全巡检结果正常，如有异常我会继续通知你。'
          : '收到，这里是 IM 演示自动回复，真实后端恢复后会切回实时消息。';

    appendPreviewMessage(conversationId, {
      id: `reply-${Date.now()}`,
      conversationId,
      senderId: 'peer',
      type: 'TEXT',
      body: { text: replyText },
      createdAt: new Date().toISOString()
    });
  }, 900);
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

export async function loadConversations(fetcher: typeof fetch = fetch): Promise<LoadableData<ConversationRow[]>> {
  if (isPreviewDemoMode()) {
    return {
      data: getPreviewConversationRows(),
      source: 'demo',
      notice: getPreviewNotice('demo')
    };
  }

  return withDemoFallback(
    () => listConversations(fetcher),
    getPreviewConversationRows(),
    '会话列表接口暂不可用，当前展示 IM 演示会话。'
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
  if (isPreviewDemoMode()) {
    return {
      data: getPreviewConversationMessages(conversationId),
      source: 'demo',
      notice: getPreviewNotice('demo')
    };
  }

  return withDemoFallback(
    () => listMessages(conversationId, fetcher),
    getPreviewConversationMessages(conversationId),
    '消息接口暂不可用，当前展示 IM 演示消息。'
  );
}

export async function sendTextMessage(
  conversationId: string,
  text: string,
  fetcher: typeof fetch = fetch
): Promise<MessageRow | null> {
  if (isPreviewDemoMode()) {
    const created: MessageRow = {
      id: `preview-${Date.now()}`,
      conversationId,
      senderId: 'self',
      type: 'TEXT',
      body: { text },
      createdAt: new Date().toISOString()
    };
    appendPreviewMessage(conversationId, created);
    schedulePreviewReply(conversationId, text);
    return created;
  }

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
  if (isPreviewDemoMode()) {
    const normalizedPhone = peerPhone.replace(/\D/g, '');
    const matchedContact = previewContacts.find((item) => item.phone.replace(/\D/g, '') === normalizedPhone);
    return ensurePreviewConversation({
      id: buildFallbackConversationId(peerPhone),
      title: matchedContact?.title || `联系人 ${normalizedPhone.slice(-4) || '演示'}`,
      type: matchedContact?.type || 'DM'
    });
  }

  const payload = await apiPost<unknown>(
    '/api/conversations/dm',
    {
      peerPhone
    },
    fetcher
  );

  return normalizeConversation(payload);
}
