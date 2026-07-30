import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '../state/session';
import { apiFetch, apiGet, apiPost } from './client';
import { withDemoFallback, type LoadableData } from './loadable';

export type ConversationRow = {
  id: string;
  type: string;
  title: string | null;
  lastMessage: string | null;
  updatedAt: string | null;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
};

export type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string | null;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
  body: Record<string, unknown>;
  status?: string | null;
  createdAt: string | null;
};

const PREVIEW_STORAGE_KEY = 'jiandanliao_preview_im_v1';
const PREVIEW_UPDATE_EVENT = 'jiandanliao:preview-im-updated';

type PreviewContact = {
  phone: string;
  title: string;
  type: 'SYSTEM' | 'DM' | 'GROUP';
};

export type SelectableContactRow = {
  phone: string;
  title: string;
  type: PreviewContact['type'];
};

type PreviewStore = {
  conversations: ConversationRow[];
  messages: Record<string, MessageRow[]>;
};

type UploadedBinaryFile = {
  fileId: string;
  url: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  transcoded: boolean;
};

type RealtimeSubscriptionInput = {
  conversationIds?: string[];
};

let realtimeSocket: Socket | null = null;
let realtimeSocketBoundToken: string | null = null;
let realtimeSocketSubject: string | null = null;

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
      updatedAt: buildIso(5),
      unreadCount: 1,
      isPinned: true,
      isMuted: false
    },
    {
      id: 'demo-business',
      type: 'DM',
      title: '商务对接',
      lastMessage: '可以先确认一下今天的投放排期。',
      updatedAt: buildIso(18),
      unreadCount: 2,
      isPinned: false,
      isMuted: false
    },
    {
      id: 'demo-agency',
      type: 'GROUP',
      title: '渠道伙伴群',
      lastMessage: '新代理活动今晚 20:00 上线。',
      updatedAt: buildIso(37),
      unreadCount: 0,
      isPinned: false,
      isMuted: true
    },
    {
      id: 'demo-security',
      type: 'DM',
      title: '安全专员',
      lastMessage: '你的账号风控巡检已完成，状态正常。',
      updatedAt: buildIso(84),
      unreadCount: 1,
      isPinned: false,
      isMuted: false
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
    updatedAt: new Date().toISOString(),
    unreadCount: 0,
    isPinned: false,
    isMuted: false
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
  conversation.unreadCount =
    message.senderId === 'self' || message.type === 'SYSTEM' ? conversation.unreadCount || 0 : (conversation.unreadCount || 0) + 1;
  store.conversations = sortConversations(store.conversations);
  savePreviewStore(store);
};

const markPreviewConversationRead = (conversationId: string) => {
  const store = loadPreviewStore();
  const conversation = store.conversations.find((row) => row.id === conversationId);
  if (!conversation) {
    return {
      ok: true as const,
      conversationId,
      unreadCount: 0,
      status: 'already read' as const
    };
  }

  const unreadCount = Number(conversation.unreadCount || 0);
  conversation.unreadCount = 0;
  savePreviewStore(store);

  return {
    ok: true as const,
    conversationId,
    unreadCount: 0,
    status: unreadCount > 0 ? ('acknowledged' as const) : ('already read' as const)
  };
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

const makePreviewObjectUrl = (file: File) => {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(file);
  }
  return `preview/${file.name}`;
};

const createPreviewMessage = (
  conversationId: string,
  type: MessageRow['type'],
  body: Record<string, unknown>
): MessageRow => {
  const created: MessageRow = {
    id: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    senderId: 'self',
    type,
    body,
    status: 'SENT',
    createdAt: new Date().toISOString()
  };

  appendPreviewMessage(conversationId, created);
  schedulePreviewReply(conversationId, getMessageText(created));
  return created;
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
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
    unreadCount: typeof row.unreadCount === 'number' ? row.unreadCount : Number(row.unreadCount || 0),
    isPinned: Boolean(row.isPinned),
    isMuted: Boolean(row.isMuted)
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
    status: typeof row.status === 'string' ? row.status : null,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null
  };
};

const resolveSocketUrl = () => {
  if (typeof window === 'undefined') return '';
  const envUrl = import.meta.env.VITE_WS_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim();
  }

  const { protocol, hostname, port } = window.location;
  if ((hostname === '127.0.0.1' || hostname === 'localhost') && port === '5173') {
    return `${protocol}//${hostname}:3002`;
  }
  return `${protocol}//${window.location.host}`;
};

const decodeTokenSubject = (token: string | null) => {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = typeof window.atob === 'function' ? window.atob(padded) : '';
    const parsed = JSON.parse(json) as { sub?: string };
    return typeof parsed.sub === 'string' ? parsed.sub : null;
  } catch {
    return null;
  }
};

const getRealtimeSocket = () => {
  if (typeof window === 'undefined' || import.meta.env.VITEST) return null;

  if (!realtimeSocket) {
    realtimeSocket = io(resolveSocketUrl(), {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      autoConnect: true
    });
    realtimeSocket.on('connect', () => {
      if (realtimeSocketSubject) {
        realtimeSocket?.emit('auth:authenticate', { userId: realtimeSocketSubject });
      }
    });
    realtimeSocketBoundToken = null;
  }

  const accessToken = getAccessToken();
  if (realtimeSocket && accessToken && accessToken !== realtimeSocketBoundToken) {
    const subject = decodeTokenSubject(accessToken);
    if (subject) {
      realtimeSocketSubject = subject;
      realtimeSocket.emit('auth:authenticate', { userId: subject });
      realtimeSocketBoundToken = accessToken;
    }
  }

  return realtimeSocket;
};

const getConversationIds = (input?: RealtimeSubscriptionInput) =>
  [...new Set((input?.conversationIds || []).map((item) => item.trim()).filter(Boolean))];

async function uploadBinaryFile(
  file: File,
  kind: 'image' | 'voice',
  fetcher: typeof fetch = fetch
): Promise<UploadedBinaryFile> {
  const formData = new FormData();
  formData.set('kind', kind);
  formData.set('file', file);

  try {
    const response = await apiFetch(
      '/api/files/upload-binary',
      {
        method: 'POST',
        body: formData
      },
      fetcher
    );
    return (await response.json()) as UploadedBinaryFile;
  } catch {
    return {
      fileId: `local-${Date.now()}`,
      url: makePreviewObjectUrl(file),
      mime: file.type || (kind === 'image' ? 'image/png' : 'audio/aac'),
      size: file.size,
      width: null,
      height: null,
      durationMs: null,
      transcoded: false
    };
  }
}

async function probeAudioDurationMs(file: File): Promise<number> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return 1_000;
  }

  return await new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    const done = (durationMs: number) => {
      URL.revokeObjectURL(objectUrl);
      resolve(durationMs > 0 ? durationMs : 1_000);
    };

    const timer = window.setTimeout(() => done(1_000), 1_500);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done(Math.max(1_000, Math.round((audio.duration || 0) * 1_000)));
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      done(1_000);
    };
    audio.src = objectUrl;
  });
}

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
    getPreviewConversationRows(),
    '会话列表接口暂不可用，当前展示降级 IM 演示会话。'
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
    getPreviewConversationMessages(conversationId),
    '消息接口暂不可用，当前展示降级 IM 演示消息。'
  );
}

export async function sendTextMessage(
  conversationId: string,
  text: string,
  fetcher: typeof fetch = fetch
): Promise<MessageRow | null> {
  try {
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
  } catch {
    return createPreviewMessage(conversationId, 'TEXT', { text });
  }
}

export async function sendImageMessage(
  conversationId: string,
  file: File,
  fetcher: typeof fetch = fetch
): Promise<MessageRow | null> {
  const uploaded = await uploadBinaryFile(file, 'image', fetcher);
  const body = {
    fileId: uploaded.fileId,
    objectKey: uploaded.url,
    url: uploaded.url,
    mimeType: uploaded.mime || file.type || 'image/png',
    dedupeKey: `${file.name}:${file.size}:${file.lastModified}`,
    width: uploaded.width,
    height: uploaded.height,
    size: uploaded.size
  };

  try {
    const payload = await apiPost<unknown>(
      '/api/messages',
      {
        conversationId,
        type: 'IMAGE',
        body
      },
      fetcher
    );
    return normalizeMessage(payload);
  } catch {
    return createPreviewMessage(conversationId, 'IMAGE', body);
  }
}

export async function sendAudioMessage(
  conversationId: string,
  file: File,
  fetcher: typeof fetch = fetch
): Promise<MessageRow | null> {
  const uploaded = await uploadBinaryFile(file, 'voice', fetcher);
  const durationMs = uploaded.durationMs || (await probeAudioDurationMs(file));
  const body = {
    fileId: uploaded.fileId,
    objectKey: uploaded.url,
    url: uploaded.url,
    mimeType: uploaded.mime || file.type || 'audio/aac',
    durationMs,
    dedupeKey: `${file.name}:${file.size}:${file.lastModified}`,
    size: uploaded.size
  };

  try {
    const payload = await apiPost<unknown>(
      '/api/messages',
      {
        conversationId,
        type: 'AUDIO',
        body
      },
      fetcher
    );
    return normalizeMessage(payload);
  } catch {
    return createPreviewMessage(conversationId, 'AUDIO', body);
  }
}

export async function markConversationRead(
  conversationId: string,
  fetcher: typeof fetch = fetch
): Promise<{ ok: true; conversationId: string; unreadCount: number; status?: string }> {
  try {
    return await apiPost<{ ok: true; conversationId: string; unreadCount: number; status?: string }>(
      '/api/messages/read',
      { conversationId },
      fetcher
    );
  } catch {
    return markPreviewConversationRead(conversationId);
  }
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

export async function createGroupConversation(
  input: { title?: string; memberPhones: string[] },
  fetcher: typeof fetch = fetch
): Promise<ConversationRow | null> {
  const payload = await apiPost<unknown>('/api/conversations/group', input, fetcher);
  return normalizeConversation(payload);
}

export async function loadSelectableContacts(): Promise<SelectableContactRow[]> {
  return previewContacts.map((item) => ({
    phone: item.phone,
    title: item.title,
    type: item.type
  }));
}

export function subscribeRealtimeMessages(
  listener: () => void,
  input?: RealtimeSubscriptionInput
) {
  const socket = getRealtimeSocket();
  if (!socket) {
    return () => undefined;
  }

  const handler = () => listener();
  const events = [
    'message:new',
    'receipt:new',
    'message_created',
    'message_read',
    'message_delivered',
    'unread.updated'
  ] as const;
  const conversationIds = getConversationIds(input);

  const joinSubscribedConversations = () => {
    conversationIds.forEach((conversationId) => {
      socket.emit('conversation:join', { conversationId });
    });
  };

  events.forEach((eventName) => {
    socket.on(eventName, handler);
  });
  socket.on('connect', joinSubscribedConversations);
  joinSubscribedConversations();

  return () => {
    events.forEach((eventName) => {
      socket.off(eventName, handler);
    });
    socket.off('connect', joinSubscribedConversations);
  };
}
