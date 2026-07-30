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

type PreviewFriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  note: string;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
};

type PreviewTag = {
  id: string;
  ownerUserId: string;
  title: string;
  note: string;
  memberUserIds: string[];
  createdAt: string;
};

type PreviewBlock = {
  id: string;
  ownerUserId: string;
  targetUserId: string;
  createdAt: string;
};

type PreviewReport = {
  id: string;
  reporterUserId: string;
  targetUserId: string;
  reason: string;
  status: 'OPEN';
  createdAt: string;
};

type PreviewStoreState = {
  users: PreviewUser[];
  conversations: PreviewConversation[];
  messages: Record<string, PreviewMessage[]>;
  receipts: PreviewReceipt[];
  friendRequests: PreviewFriendRequest[];
  tags: PreviewTag[];
  blocks: PreviewBlock[];
  reports: PreviewReport[];
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
  },
  {
    id: 'user-demo-5',
    phone: '855010188001',
    password: 'demo123456',
    nickname: '阿杰商务',
    status: 'ACTIVE',
    devices: {}
  },
  {
    id: 'user-demo-6',
    phone: '855010188002',
    password: 'demo123456',
    nickname: '运营小晴',
    status: 'ACTIVE',
    devices: {}
  },
  {
    id: 'user-demo-7',
    phone: '855010188003',
    password: 'demo123456',
    nickname: '风控专员 May',
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

const seedFriendRequests: PreviewFriendRequest[] = [
  {
    id: 'friend-1',
    fromUserId: 'user-demo-5',
    toUserId: 'user-demo-1',
    note: '通过渠道会认识你，想拉你进合作对接群。',
    status: 'PENDING',
    createdAt: buildIso(50)
  },
  {
    id: 'friend-2',
    fromUserId: 'user-demo-6',
    toUserId: 'user-demo-1',
    note: '备注：活动复盘资料已经整理好，方便随时沟通。',
    status: 'PENDING',
    createdAt: buildIso(42)
  },
  {
    id: 'friend-3',
    fromUserId: 'user-demo-7',
    toUserId: 'user-demo-1',
    note: '你已通过企业认证，可以直接同步安全设置提醒。',
    status: 'ACCEPTED',
    createdAt: buildIso(80)
  }
];

const seedTags: PreviewTag[] = [
  {
    id: 'tag-1',
    ownerUserId: 'user-demo-1',
    title: '渠道合作',
    note: '用于日常合作、活动排期和投放沟通。',
    memberUserIds: ['user-demo-2', 'user-demo-3', 'user-demo-6'],
    createdAt: buildIso(120)
  },
  {
    id: 'tag-2',
    ownerUserId: 'user-demo-1',
    title: '安全与风控',
    note: '统一查看账号、设备、风控和告警相关联系人。',
    memberUserIds: ['user-demo-4', 'user-demo-7'],
    createdAt: buildIso(110)
  },
  {
    id: 'tag-3',
    ownerUserId: 'user-demo-1',
    title: '核心客户',
    note: '用于重点客户跟进和高优先事项处理。',
    memberUserIds: ['user-demo-2', 'user-demo-3', 'user-demo-5'],
    createdAt: buildIso(100)
  }
];

const createInitialState = (): PreviewStoreState => ({
  users: users.map((item) => ({ ...item, devices: { ...item.devices } })),
  conversations: seedConversations.map((item) => ({ ...item, members: [...item.members] })),
  messages: Object.fromEntries(
    Object.entries(seedMessages).map(([key, value]) => [key, value.map((item) => ({ ...item, body: { ...item.body } }))])
  ),
  receipts: [],
  friendRequests: seedFriendRequests.map((item) => ({ ...item })),
  tags: seedTags.map((item) => ({ ...item, memberUserIds: [...item.memberUserIds] })),
  blocks: [],
  reports: []
});

const state: PreviewStoreState = createInitialState();

const sortConversations = (rows: PreviewConversation[]) =>
  rows.sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`));

const normalizePhone = (phone: string) => phone.trim();

const getUserByPhone = (phone: string) => state.users.find((item) => item.phone === normalizePhone(phone));

const getUserById = (userId: string) => state.users.find((item) => item.id === userId);

const previewServiceEntries = [
  {
    id: 'service-system',
    title: '系统通知',
    subtitle: '服务 · 公告与风控统一入口',
    type: '服务' as const,
    to: '/h5/system-notice'
  },
  {
    id: 'service-wallet',
    title: '钱包',
    subtitle: '服务 · 余额、收付款和账单',
    type: '服务' as const,
    to: '/h5/wallet'
  },
  {
    id: 'service-agent',
    title: '代理中心',
    subtitle: '服务 · 查看团队与等级',
    type: '服务' as const,
    to: '/h5/agent'
  }
];

const previewContentEntries = [
  {
    id: 'content-1',
    title: '高转化私域触达模板',
    subtitle: '内容 · 看一看频道推荐',
    type: '内容' as const,
    to: '/h5/discover/channels'
  },
  {
    id: 'content-2',
    title: '新人活动复盘',
    subtitle: '内容 · 朋友圈与活动动态',
    type: '内容' as const,
    to: '/h5/discover/moments'
  }
];

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

const mapFriendRequestRow = (request: PreviewFriendRequest) => {
  const fromUser = getUserById(request.fromUserId);
  return {
    id: request.id,
    name: fromUser?.nickname || '未知联系人',
    phone: fromUser?.phone || '--',
    note: request.note,
    status: request.status === 'ACCEPTED' ? ('已添加' as const) : ('待通过' as const),
    createdAt: request.createdAt
  };
};

const mapTagRow = (tag: PreviewTag) => ({
  id: tag.id,
  title: tag.title,
  count: tag.memberUserIds.length,
  members: tag.memberUserIds
    .map((userId) => {
      const user = getUserById(userId);
      if (!user) {
        return null;
      }
      return {
        id: user.id,
        name: user.nickname,
        phone: user.phone
      };
    })
    .filter((value): value is { id: string; name: string; phone: string } => Boolean(value)),
  note: tag.note,
  createdAt: tag.createdAt
});

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

const hasReadReceipt = (messageId: string, userId: string) =>
  state.receipts.some((item) => item.messageId === messageId && item.userId === userId && item.type === 'READ');

const getConversationUnreadCount = (conversationId: string, userId: string) =>
  listMessagesByConversation(conversationId).filter(
    (message) => message.senderId !== null && message.senderId !== userId && !hasReadReceipt(message.id, userId)
  ).length;

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

const findExistingDmConversation = (ownerUserId: string, peerUserId: string) =>
  state.conversations.find(
    (item) =>
      item.type === 'DM' &&
      item.members.length === 2 &&
      item.members.includes(ownerUserId) &&
      item.members.includes(peerUserId)
  );

const isBlockedByOwner = (ownerUserId: string, targetUserId: string) =>
  state.blocks.some((item) => item.ownerUserId === ownerUserId && item.targetUserId === targetUserId);

const findLatestRelationship = (ownerUserId: string, targetUserId: string) =>
  [...state.friendRequests]
    .filter(
      (item) =>
        (item.fromUserId === ownerUserId && item.toUserId === targetUserId) ||
        (item.fromUserId === targetUserId && item.toUserId === ownerUserId)
    )
    .sort((a, b) => `${b.createdAt}`.localeCompare(`${a.createdAt}`))[0];

const getOwnedTagsForMember = (ownerUserId: string, memberUserId: string) =>
  state.tags
    .filter((item) => item.ownerUserId === ownerUserId && item.memberUserIds.includes(memberUserId))
    .map((item) => ({
      id: item.id,
      title: item.title
    }));

const hasAcceptedFriendship = (ownerUserId: string, targetUserId: string) =>
  state.friendRequests.some(
    (item) =>
      item.status === 'ACCEPTED' &&
      ((item.fromUserId === ownerUserId && item.toUserId === targetUserId) ||
        (item.fromUserId === targetUserId && item.toUserId === ownerUserId))
  );

const buildRelationshipState = (ownerUserId: string, targetUserId: string) => {
  if (ownerUserId === targetUserId) {
    return 'SELF' as const;
  }
  if (isBlockedByOwner(ownerUserId, targetUserId)) {
    return 'BLOCKED' as const;
  }
  const latest = findLatestRelationship(ownerUserId, targetUserId);
  if (latest?.status === 'ACCEPTED' || hasAcceptedFriendship(ownerUserId, targetUserId)) {
    return 'FRIEND' as const;
  }
  if (latest?.status === 'PENDING') {
    return latest.toUserId === ownerUserId ? ('PENDING_INCOMING' as const) : ('PENDING_OUTGOING' as const);
  }
  return 'NONE' as const;
};

const mapContactSummary = (ownerUserId: string, targetUserId: string) => {
  const user = getUserById(targetUserId);
  if (!user) {
    return null;
  }
  const latest = findLatestRelationship(ownerUserId, targetUserId);
  return {
    id: user.id,
    name: user.nickname,
    phone: user.phone,
    tags: getOwnedTagsForMember(ownerUserId, targetUserId),
    note: latest?.note || '',
    relationship: buildRelationshipState(ownerUserId, targetUserId)
  };
};

const mapContactProfile = (ownerUserId: string, targetUserId: string) => {
  const user = getUserById(targetUserId);
  if (!user) {
    throw new Error('user not found');
  }
  const latest = findLatestRelationship(ownerUserId, targetUserId);
  const relationship = buildRelationshipState(ownerUserId, targetUserId);
  return {
    id: user.id,
    name: user.nickname,
    phone: user.phone,
    tags: getOwnedTagsForMember(ownerUserId, targetUserId),
    note: latest?.note || '',
    relationship,
    requestId: latest?.id || null,
    requestNote: latest?.note || '',
    canSendMessage: relationship === 'FRIEND',
    canSendRequest: relationship === 'NONE'
  };
};

const toConversationRow = (conversation: PreviewConversation, currentUserId: string) => ({
  id: conversation.id,
  type: conversation.type,
  title:
    conversation.type === 'DM'
      ? getDirectPeerTitle(conversation.members, currentUserId)
      : (conversation.title ?? conversation.type),
  lastMessage: conversation.lastMessage,
  updatedAt: conversation.updatedAt,
  unreadCount: getConversationUnreadCount(conversation.id, currentUserId),
  isPinned: false,
  isMuted: false
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
  reset() {
    const next = createInitialState();
    state.users.splice(0, state.users.length, ...next.users);
    state.conversations.splice(0, state.conversations.length, ...next.conversations);
    state.friendRequests.splice(0, state.friendRequests.length, ...next.friendRequests);
    state.tags.splice(0, state.tags.length, ...next.tags);
    state.blocks.splice(0, state.blocks.length, ...next.blocks);
    state.reports.splice(0, state.reports.length, ...next.reports);
    state.receipts.splice(0, state.receipts.length, ...next.receipts);
    for (const key of Object.keys(state.messages)) {
      delete state.messages[key];
    }
    Object.assign(state.messages, next.messages);
  },

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
  },

  markConversationRead(input: { phone: string; conversationId: string }) {
    const access = this.resolveUserAccess(input.phone);
    ensureMember(input.conversationId, access.userId);
    const unreadMessages = listMessagesByConversation(input.conversationId).filter(
      (message) =>
        message.senderId !== null && message.senderId !== access.userId && !hasReadReceipt(message.id, access.userId)
    );

    if (!unreadMessages.length) {
      return {
        ok: true as const,
        conversationId: input.conversationId,
        unreadCount: 0,
        status: 'already read' as const
      };
    }

    const createdAt = new Date().toISOString();
    state.receipts.push(
      ...unreadMessages.map((message) => ({
        id: randomUUID(),
        messageId: message.id,
        userId: access.userId,
        type: 'READ' as const,
        createdAt
      }))
    );

    return {
      ok: true as const,
      conversationId: input.conversationId,
      unreadCount: 0,
      status: 'acknowledged' as const
    };
  },

  listContacts(phone: string) {
    const user = ensureUser({ phone });
    const candidateIds = new Set<string>();

    state.friendRequests.forEach((item) => {
      if (item.status !== 'ACCEPTED') {
        return;
      }
      if (item.fromUserId === user.id) {
        candidateIds.add(item.toUserId);
      }
      if (item.toUserId === user.id) {
        candidateIds.add(item.fromUserId);
      }
    });

    state.conversations
      .filter((item) => item.type === 'DM' && item.members.includes(user.id))
      .forEach((item) => {
        item.members.filter((memberId) => memberId !== user.id).forEach((memberId) => candidateIds.add(memberId));
      });

    state.tags
      .filter((item) => item.ownerUserId === user.id)
      .forEach((item) => item.memberUserIds.forEach((memberId) => candidateIds.add(memberId)));

    return [...candidateIds]
      .filter((targetUserId) => !isBlockedByOwner(user.id, targetUserId))
      .map((targetUserId) => mapContactSummary(user.id, targetUserId))
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  },

  listFriendRequests(phone: string) {
    const user = ensureUser({ phone });
    return state.friendRequests
      .filter((item) => item.toUserId === user.id)
      .sort((a, b) => `${b.createdAt}`.localeCompare(`${a.createdAt}`))
      .map((item) => mapFriendRequestRow(item));
  },

  acceptFriendRequest(input: { phone: string; requestId: string }) {
    const user = ensureUser({ phone: input.phone });
    const request = state.friendRequests.find((item) => item.id === input.requestId && item.toUserId === user.id);
    if (!request) {
      throw new Error('friend request not found');
    }

    request.status = 'ACCEPTED';
    const fromUser = getUserById(request.fromUserId);
    if (fromUser) {
      this.createDm({ ownerPhone: user.phone, peerPhone: fromUser.phone });
    }

    return mapFriendRequestRow(request);
  },

  sendFriendRequest(input: { phone: string; targetPhone: string; note?: string }) {
    const user = ensureUser({ phone: input.phone });
    const target = getUserByPhone(input.targetPhone);
    if (!target) {
      throw new Error('user not found');
    }
    if (target.id === user.id) {
      throw new Error('cannot add self');
    }

    const relationship = buildRelationshipState(user.id, target.id);
    if (relationship === 'FRIEND') {
      throw new Error('already friends');
    }
    if (relationship === 'PENDING_INCOMING' || relationship === 'PENDING_OUTGOING') {
      throw new Error('friend request already pending');
    }

    const request: PreviewFriendRequest = {
      id: `friend-${randomUUID()}`,
      fromUserId: user.id,
      toUserId: target.id,
      note: input.note?.trim() || '你好，想加你为好友。',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    state.friendRequests.unshift(request);
    return {
      id: request.id,
      name: target.nickname,
      phone: target.phone,
      note: request.note,
      status: '待通过' as const,
      createdAt: request.createdAt
    };
  },

  getContactProfile(input: { phone: string; targetPhone: string }) {
    const user = ensureUser({ phone: input.phone });
    const target = getUserByPhone(input.targetPhone);
    if (!target) {
      throw new Error('user not found');
    }
    return mapContactProfile(user.id, target.id);
  },

  removeContact(input: { phone: string; targetPhone: string }) {
    const user = ensureUser({ phone: input.phone });
    const target = getUserByPhone(input.targetPhone);
    if (!target) {
      throw new Error('user not found');
    }

    state.friendRequests = state.friendRequests.filter(
      (item) =>
        !(
          (item.fromUserId === user.id && item.toUserId === target.id) ||
          (item.fromUserId === target.id && item.toUserId === user.id)
        )
    );

    state.tags
      .filter((item) => item.ownerUserId === user.id)
      .forEach((item) => {
        item.memberUserIds = item.memberUserIds.filter((memberId) => memberId !== target.id);
      });

    return {
      ok: true as const,
      status: 'REMOVED' as const
    };
  },

  blockContact(input: { phone: string; targetPhone: string }) {
    const user = ensureUser({ phone: input.phone });
    const target = getUserByPhone(input.targetPhone);
    if (!target) {
      throw new Error('user not found');
    }

    state.blocks = state.blocks.filter(
      (item) => !(item.ownerUserId === user.id && item.targetUserId === target.id)
    );
    state.blocks.unshift({
      id: randomUUID(),
      ownerUserId: user.id,
      targetUserId: target.id,
      createdAt: new Date().toISOString()
    });

    this.removeContact(input);

    return {
      ok: true as const,
      status: 'BLOCKED' as const
    };
  },

  reportContact(input: { phone: string; targetPhone: string; reason: string }) {
    const user = ensureUser({ phone: input.phone });
    const target = getUserByPhone(input.targetPhone);
    if (!target) {
      throw new Error('user not found');
    }

    const report: PreviewReport = {
      id: randomUUID(),
      reporterUserId: user.id,
      targetUserId: target.id,
      reason: input.reason.trim(),
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    state.reports.unshift(report);
    return {
      id: report.id,
      status: report.status
    };
  },

  listTags(phone: string) {
    const user = ensureUser({ phone });
    return state.tags
      .filter((item) => item.ownerUserId === user.id)
      .sort((a, b) => `${b.createdAt}`.localeCompare(`${a.createdAt}`))
      .map((item) => mapTagRow(item));
  },

  listTagMembers(input: { phone: string; tagId: string }) {
    const user = ensureUser({ phone: input.phone });
    const tag = state.tags.find((item) => item.id === input.tagId && item.ownerUserId === user.id);
    if (!tag) {
      throw new Error('tag not found');
    }
    return mapTagRow(tag).members;
  },

  addTagMember(input: { phone: string; tagId: string; contactPhone: string }) {
    const user = ensureUser({ phone: input.phone });
    const tag = state.tags.find((item) => item.id === input.tagId && item.ownerUserId === user.id);
    if (!tag) {
      throw new Error('tag not found');
    }

    const target = getUserByPhone(input.contactPhone);
    if (!target) {
      throw new Error('user not found');
    }
    if (tag.memberUserIds.includes(target.id)) {
      throw new Error('contact already in tag');
    }

    tag.memberUserIds.push(target.id);
    return {
      ok: true as const
    };
  },

  removeTagMember(input: { phone: string; tagId: string; contactPhone: string }) {
    const user = ensureUser({ phone: input.phone });
    const tag = state.tags.find((item) => item.id === input.tagId && item.ownerUserId === user.id);
    if (!tag) {
      throw new Error('tag not found');
    }

    const target = getUserByPhone(input.contactPhone);
    if (!target) {
      throw new Error('user not found');
    }

    tag.memberUserIds = tag.memberUserIds.filter((memberId) => memberId !== target.id);
    return {
      ok: true as const
    };
  },

  createTag(input: { phone: string; title: string }) {
    const user = ensureUser({ phone: input.phone });
    const title = input.title.trim();
    if (!title) {
      throw new Error('tag title required');
    }

    const tag: PreviewTag = {
      id: `tag-${randomUUID()}`,
      ownerUserId: user.id,
      title,
      note: '新建标签，后续可继续补充成员。',
      memberUserIds: [],
      createdAt: new Date().toISOString()
    };
    state.tags.unshift(tag);
    return mapTagRow(tag);
  },

  search(input: { phone: string; keyword?: string }) {
    const user = ensureUser({ phone: input.phone });
    const keyword = input.keyword?.trim().toLowerCase() || '';

    const contacts = state.users
      .filter((item) => item.id !== user.id)
      .map((item) => ({
        id: `contact-${item.id}`,
        title: item.nickname,
        subtitle: `联系人 · ${item.phone}`,
        type: '联系人' as const,
        to: `/h5/contacts/profile/${encodeURIComponent(item.phone)}`
      }));

    const groups = state.conversations
      .filter((item) => item.type === 'GROUP' && item.members.includes(user.id))
      .map((item) => ({
        id: `group-${item.id}`,
        title: item.title || '未命名群聊',
        subtitle: `群聊 · ${item.lastMessage || '进入群聊查看最新消息'}`,
        type: '群聊' as const,
        to: `/h5/chat/${item.id}`
      }));

    const rows = [...contacts, ...groups, ...previewServiceEntries, ...previewContentEntries];
    if (!keyword) {
      return rows;
    }

    return rows.filter((item) => `${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(keyword));
  }
};
