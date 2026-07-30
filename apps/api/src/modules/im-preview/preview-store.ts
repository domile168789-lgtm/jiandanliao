import { randomUUID } from 'node:crypto';

type PreviewUser = {
  id: string;
  phone: string;
  password: string;
  nickname: string;
  status: 'ACTIVE' | 'BANNED';
  devices: Record<string, string>;
};

type PreviewConversationType = 'SYSTEM' | 'DM' | 'GROUP';

type PreviewConversation = {
  id: string;
  type: PreviewConversationType;
  title: string | null;
  lastMessage: string | null;
  updatedAt: string;
  members: string[];
  ownerUserId: string | null;
};

type PreviewMessage = {
  id: string;
  conversationId: string;
  senderId: string | null;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
  status: 'SENT';
  body: Record<string, unknown>;
  createdAt: string;
};

type PreviewReceipt = {
  id: string;
  messageId: string;
  userId: string;
  type: 'DELIVERED' | 'READ';
  createdAt: string;
};

type PreviewStoreState = {
  users: PreviewUser[];
  conversations: PreviewConversation[];
  messages: Record<string, PreviewMessage[]>;
  receipts: PreviewReceipt[];
};

const buildIso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

const users: PreviewUser[] = [
  {
    id: 'user-demo-1',
    phone: '855010100000',
    password: 'demo123456',
    nickname: '演示用户',
    status: 'ACTIVE',
    devices: {}
  },
  {
    id: 'user-demo-2',
    phone: '855010100002',
    password: 'demo123456',
    nickname: '商务对接',
    status: 'ACTIVE',
    devices: {}
  },
  {
    id: 'user-demo-3',
    phone: '855010100003',
    password: 'demo123456',
    nickname: '渠道伙伴群',
    status: 'ACTIVE',
    devices: {}
  },
  {
    id: 'user-demo-4',
    phone: '855010100004',
    password: 'demo123456',
    nickname: '安全专员',
    status: 'ACTIVE',
    devices: {}
  }
];

const seedConversations: PreviewConversation[] = [
  {
    id: 'preview-system',
    type: 'SYSTEM',
    title: '系统通知',
    lastMessage: '后台公告、风控结果和活动发布会统一进入这里。',
    updatedAt: buildIso(6),
    members: ['user-demo-1', 'user-demo-2', 'user-demo-4'],
    ownerUserId: null
  },
  {
    id: 'preview-dm-business',
    type: 'DM',
    title: '商务对接',
    lastMessage: '可以先确认一下今天的投放排期。',
    updatedAt: buildIso(18),
    members: ['user-demo-1', 'user-demo-2'],
    ownerUserId: 'user-demo-1'
  },
  {
    id: 'preview-group-agency',
    type: 'GROUP',
    title: '渠道伙伴群',
    lastMessage: '新代理活动今晚 20:00 上线。',
    updatedAt: buildIso(34),
    members: ['user-demo-1', 'user-demo-2', 'user-demo-3'],
    ownerUserId: 'user-demo-1'
  },
  {
    id: 'preview-dm-security',
    type: 'DM',
    title: '安全专员',
    lastMessage: '你的账号风控巡检已完成，状态正常。',
    updatedAt: buildIso(80),
    members: ['user-demo-1', 'user-demo-4'],
    ownerUserId: 'user-demo-1'
  }
];

const seedMessages: Record<string, PreviewMessage[]> = {
  'preview-system': [
    {
      id: 'preview-system-1',
      conversationId: 'preview-system',
      senderId: null,
      type: 'SYSTEM',
      status: 'SENT',
      body: {
        title: '欢迎进入柬单聊 IM',
        content: '当前预览已切换到后端 API 驱动模式，公告、风控和活动消息都会走统一系统会话。'
      },
      createdAt: buildIso(26)
    },
    {
      id: 'preview-system-2',
      conversationId: 'preview-system',
      senderId: null,
      type: 'SYSTEM',
      status: 'SENT',
      body: {
        title: '系统状态',
        content: '当前环境使用无数据库 API 预览存储，已可覆盖登录、会话、消息和回执主链路。'
      },
      createdAt: buildIso(6)
    }
  ],
  'preview-dm-business': [
    {
      id: 'preview-dm-business-1',
      conversationId: 'preview-dm-business',
      senderId: 'user-demo-2',
      type: 'TEXT',
      status: 'SENT',
      body: { text: '你好，这里是商务对接窗口。' },
      createdAt: buildIso(24)
    },
    {
      id: 'preview-dm-business-2',
      conversationId: 'preview-dm-business',
      senderId: 'user-demo-1',
      type: 'TEXT',
      status: 'SENT',
      body: { text: '收到，我这边正在确认今日资源位。' },
      createdAt: buildIso(18)
    }
  ],
  'preview-group-agency': [
    {
      id: 'preview-group-agency-1',
      conversationId: 'preview-group-agency',
      senderId: 'user-demo-3',
      type: 'TEXT',
      status: 'SENT',
      body: { text: '今晚 20:00 的代理活动物料已经同步。' },
      createdAt: buildIso(39)
    },
    {
      id: 'preview-group-agency-2',
      conversationId: 'preview-group-agency',
      senderId: 'user-demo-2',
      type: 'TEXT',
      status: 'SENT',
      body: { text: '你可以直接在管理后台活动中心确认。' },
      createdAt: buildIso(34)
    }
  ],
  'preview-dm-security': [
    {
      id: 'preview-dm-security-1',
      conversationId: 'preview-dm-security',
      senderId: 'user-demo-4',
      type: 'TEXT',
      status: 'SENT',
      body: { text: '今日风控巡检结果正常，如遇异常设备登录会第一时间通知你。' },
      createdAt: buildIso(80)
    }
  ]
};

const state: PreviewStoreState = {
  users,
  conversations: seedConversations,
  messages: seedMessages,
  receipts: []
};

const sortConversations = (rows: PreviewConversation[]) =>
  rows.sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`));

const normalizePhone = (phone: string) => phone.trim();

const getUserByPhone = (phone: string) => state.users.find((item) => item.phone === normalizePhone(phone));

const getUserById = (userId: string) => state.users.find((item) => item.id === userId);

const ensureUser = (input: { phone: string; password?: string; nickname?: string }) => {
  const existing = getUserByPhone(input.phone);
  if (existing) return existing;

  const created: PreviewUser = {
    id: randomUUID(),
    phone: normalizePhone(input.phone),
    password: input.password || 'demo123456',
    nickname: input.nickname || `用户${normalizePhone(input.phone).slice(-4)}`,
    status: 'ACTIVE',
    devices: {}
  };
  state.users.push(created);
  return created;
};

const previewMessageText = (message: PreviewMessage) => {
  if (typeof message.body.text === 'string' && message.body.text.trim()) return message.body.text.trim();
  if (typeof message.body.content === 'string' && message.body.content.trim()) return message.body.content.trim();
  if (typeof message.body.title === 'string' && message.body.title.trim()) return message.body.title.trim();
  if (message.type === 'SYSTEM') return '[系统消息]';
  if (message.type === 'IMAGE') return '[图片]';
  if (message.type === 'AUDIO') return '[语音]';
  if (message.type === 'VIDEO') return '[视频]';
  if (message.type === 'FILE') return '[文件]';
  return '[消息]';
};

const touchConversation = (conversationId: string, message: PreviewMessage) => {
  const row = state.conversations.find((item) => item.id === conversationId);
  if (!row) return;
  row.lastMessage = previewMessageText(message);
  row.updatedAt = message.createdAt;
  sortConversations(state.conversations);
};

const listMessagesByConversation = (conversationId: string) =>
  [...(state.messages[conversationId] || [])].sort((a, b) => `${a.createdAt}`.localeCompare(`${b.createdAt}`));

const getDirectPeerTitle = (members: string[], currentUserId: string) => {
  const peer = members.find((memberId) => memberId !== currentUserId);
  return getUserById(peer || '')?.nickname || '单聊';
};

const toConversationRow = (conversation: PreviewConversation, currentUserId: string) => ({
  id: conversation.id,
  type: conversation.type,
  title:
    conversation.type === 'DM'
      ? getDirectPeerTitle(conversation.members, currentUserId)
      : (conversation.title ?? conversation.type),
  lastMessage: conversation.lastMessage,
  updatedAt: conversation.updatedAt
});

const ensureMember = (conversationId: string, userId: string) => {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation || !conversation.members.includes(userId)) {
    throw new Error('forbidden conversation access');
  }
  return conversation;
};

const scheduleAutoReply = (conversationId: string, senderId: string, text: string) => {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation || conversation.type === 'SYSTEM') return;

  const peerId = conversation.members.find((memberId) => memberId !== senderId);
  if (!peerId) return;

  const replyText =
    text.includes('活动') || text.includes('排期')
      ? '已收到，这条需求我会同步到活动和投放排期里。'
      : text.includes('安全') || text.includes('风控')
        ? '安全巡检结果正常，如有异常我会继续通知你。'
        : conversation.type === 'GROUP'
          ? '群内已收到，本地 API 预览会继续保留会话和消息状态。'
          : '收到，这里已经切换成后端接口驱动的 IM 预览链路。';

  const reply: PreviewMessage = {
    id: randomUUID(),
    conversationId,
    senderId: peerId,
    type: 'TEXT',
    status: 'SENT',
    body: { text: replyText },
    createdAt: new Date().toISOString()
  };
  const rows = state.messages[conversationId] || [];
  rows.push(reply);
  state.messages[conversationId] = rows;
  touchConversation(conversationId, reply);
};

export const isPreviewStoreEnabled = () => !process.env.DATABASE_URL;

export const previewStore = {
  register(input: { phone: string; password: string; deviceId: string; nickname?: string }) {
    const existing = getUserByPhone(input.phone);
    if (existing) {
      throw new Error('user already exists');
    }

    const user = ensureUser(input);
    user.devices[input.deviceId] = `preview-refresh-${randomUUID()}`;
    return {
      user,
      refreshToken: user.devices[input.deviceId]
    };
  },

  login(input: { phone: string; password: string; deviceId: string }) {
    const user = getUserByPhone(input.phone);
    if (!user) throw new Error('user not found');
    if (user.status === 'BANNED') throw new Error('user banned');
    if (!user.password) throw new Error('no password set');
    if (user.password !== input.password) throw new Error('invalid password');

    user.devices[input.deviceId] = `preview-refresh-${randomUUID()}`;
    return {
      user,
      refreshToken: user.devices[input.deviceId]
    };
  },

  refresh(input: { phone: string; refreshToken: string; deviceId: string }) {
    const user = getUserByPhone(input.phone);
    if (!user) throw new Error('user not found');
    const stored = user.devices[input.deviceId];
    if (!stored || stored !== input.refreshToken) throw new Error('invalid refresh token');
    user.devices[input.deviceId] = `preview-refresh-${randomUUID()}`;
    return {
      user,
      refreshToken: user.devices[input.deviceId]
    };
  },

  resolveUserAccess(phone: string) {
    const user = getUserByPhone(phone);
    if (!user) throw new Error('user not found');
    if (user.status === 'BANNED') throw new Error('user banned');
    return {
      userId: user.id,
      status: user.status
    };
  },

  listConversations(phone: string) {
    const user = ensureUser({ phone });
    return sortConversations(
      state.conversations.filter((conversation) => conversation.members.includes(user.id))
    ).map((conversation) => toConversationRow(conversation, user.id));
  },

  createDm(input: { ownerPhone: string; peerPhone: string }) {
    const owner = ensureUser({ phone: input.ownerPhone });
    const peer = ensureUser({ phone: input.peerPhone, nickname: `联系人${input.peerPhone.slice(-4)}` });
    const existing = state.conversations.find(
      (item) =>
        item.type === 'DM' &&
        item.members.length === 2 &&
        item.members.includes(owner.id) &&
        item.members.includes(peer.id)
    );
    if (existing) {
      return {
        id: existing.id,
        type: existing.type,
        title: getDirectPeerTitle(existing.members, owner.id),
        updatedAt: existing.updatedAt
      };
    }

    const conversation: PreviewConversation = {
      id: randomUUID(),
      type: 'DM',
      title: peer.nickname,
      lastMessage: '新会话已创建，可以开始发送消息。',
      updatedAt: new Date().toISOString(),
      members: [owner.id, peer.id],
      ownerUserId: owner.id
    };
    state.conversations.unshift(conversation);
    state.messages[conversation.id] = [
      {
        id: randomUUID(),
        conversationId: conversation.id,
        senderId: peer.id,
        type: 'TEXT',
        status: 'SENT',
        body: { text: `你好，我是 ${peer.nickname}，当前会话已通过后端 API 创建。` },
        createdAt: conversation.updatedAt
      }
    ];
    return {
      id: conversation.id,
      type: conversation.type,
      title: peer.nickname,
      updatedAt: conversation.updatedAt
    };
  },

  createGroup(input: { ownerPhone: string; title?: string; memberPhones: string[] }) {
    const owner = ensureUser({ phone: input.ownerPhone });
    const uniquePhones = Array.from(new Set([owner.phone, ...input.memberPhones.map(normalizePhone).filter(Boolean)]));

    if (uniquePhones.length < 3) {
      throw new Error('group requires at least 3 members including owner');
    }

    const members = uniquePhones.map((phone) => {
      const user = getUserByPhone(phone);
      if (!user) {
        throw new Error(`user not found: ${phone}`);
      }
      return user;
    });

    const conversation: PreviewConversation = {
      id: `preview-group-${randomUUID()}`,
      type: 'GROUP',
      title: input.title?.trim() || '新的群聊',
      lastMessage: null,
      updatedAt: new Date().toISOString(),
      members: members.map((item) => item.id),
      ownerUserId: owner.id
    };

    state.conversations.unshift(conversation);
    state.messages[conversation.id] = [];
    sortConversations(state.conversations);

    return toConversationRow(conversation, owner.id);
  },

  listMessages(input: { conversationId: string; phone: string; limit?: number }) {
    const access = this.resolveUserAccess(input.phone);
    ensureMember(input.conversationId, access.userId);
    const rows = listMessagesByConversation(input.conversationId);
    const limited = rows.slice(-Math.min(Math.max(input.limit || 50, 1), 200));
    return limited;
  },

  createMessage(input: {
    conversationId: string;
    phone: string;
    type: PreviewMessage['type'];
    body: Record<string, unknown>;
  }) {
    const access = this.resolveUserAccess(input.phone);
    ensureMember(input.conversationId, access.userId);
    const created: PreviewMessage = {
      id: randomUUID(),
      conversationId: input.conversationId,
      senderId: access.userId,
      type: input.type,
      status: 'SENT',
      body: input.body,
      createdAt: new Date().toISOString()
    };
    const rows = state.messages[input.conversationId] || [];
    rows.push(created);
    state.messages[input.conversationId] = rows;
    touchConversation(input.conversationId, created);

    if (input.type === 'TEXT' && typeof input.body.text === 'string') {
      scheduleAutoReply(input.conversationId, access.userId, input.body.text);
    }

    return created;
  },

  acknowledgeReceipt(input: { messageId: string; phone: string; type: 'DELIVERED' | 'READ' }) {
    const access = this.resolveUserAccess(input.phone);
    const targetMessage = Object.values(state.messages)
      .flat()
      .find((item) => item.id === input.messageId);
    if (!targetMessage) throw new Error('message not found');

    ensureMember(targetMessage.conversationId, access.userId);

    const existing = state.receipts.find(
      (item) => item.messageId === input.messageId && item.userId === access.userId && item.type === input.type
    );
    if (existing) {
      return {
        id: existing.id,
        messageId: existing.messageId,
        userId: existing.userId,
        type: existing.type,
        status: 'already acknowledged',
        createdAt: existing.createdAt
      };
    }

    const receipt: PreviewReceipt = {
      id: randomUUID(),
      messageId: input.messageId,
      userId: access.userId,
      type: input.type,
      createdAt: new Date().toISOString()
    };
    state.receipts.push(receipt);
    return {
      id: receipt.id,
      messageId: receipt.messageId,
      userId: receipt.userId,
      type: receipt.type,
      status: 'acknowledged',
      createdAt: receipt.createdAt
    };
  }
};
