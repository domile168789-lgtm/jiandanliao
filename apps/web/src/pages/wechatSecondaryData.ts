export type FriendRequestItem = {
  id: string;
  name: string;
  phone: string;
  note: string;
  status: '待通过' | '已添加';
};

export type ContactTagItem = {
  id: string;
  title: string;
  count: number;
  members: string[];
  note: string;
};

export type OfficialAccountItem = {
  id: string;
  title: string;
  summary: string;
  to: string;
  badge: string;
};

export type MomentItem = {
  id: string;
  author: string;
  time: string;
  text: string;
  mediaLabel: string;
  likes: number;
  comments: number;
};

export type ChannelItem = {
  id: string;
  title: string;
  summary: string;
  tag: string;
  heat: string;
};

export type FavoriteItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
};

export type CardWalletItem = {
  id: string;
  title: string;
  description: string;
  status: string;
};

export type StickerPackItem = {
  id: string;
  title: string;
  description: string;
  downloads: string;
  installed: boolean;
};

export type SearchEntry = {
  id: string;
  title: string;
  subtitle: string;
  type: '联系人' | '群聊' | '服务' | '内容';
  to: string;
};

export const friendRequests: FriendRequestItem[] = [
  {
    id: 'friend-1',
    name: '阿杰商务',
    phone: '855010188001',
    note: '通过渠道会认识你，想拉你进合作对接群。',
    status: '待通过'
  },
  {
    id: 'friend-2',
    name: '运营小晴',
    phone: '855010188002',
    note: '备注：活动复盘资料已经整理好，方便随时沟通。',
    status: '待通过'
  },
  {
    id: 'friend-3',
    name: '风控专员 May',
    phone: '855010188003',
    note: '你已通过企业认证，可以直接同步安全设置提醒。',
    status: '已添加'
  }
];

export const contactTags: ContactTagItem[] = [
  {
    id: 'tag-1',
    title: '渠道合作',
    count: 6,
    members: ['商务对接', '渠道伙伴', '运营小晴'],
    note: '用于日常合作、活动排期和投放沟通。'
  },
  {
    id: 'tag-2',
    title: '安全与风控',
    count: 3,
    members: ['安全专员', '风控专员 May', '系统通知'],
    note: '统一查看账号、设备、风控和告警相关联系人。'
  },
  {
    id: 'tag-3',
    title: '核心客户',
    count: 4,
    members: ['渠道伙伴群', '阿杰商务', '商务对接'],
    note: '用于重点客户跟进和高优先事项处理。'
  }
];

export const officialAccounts: OfficialAccountItem[] = [
  {
    id: 'oa-1',
    title: '系统通知',
    summary: '集中查看后台公告、风控提醒与版本通知。',
    to: '/h5/system-notice',
    badge: '通知'
  },
  {
    id: 'oa-2',
    title: '钱包助手',
    summary: '查看收付款、余额、账单和结算进度。',
    to: '/h5/wallet',
    badge: '钱包'
  },
  {
    id: 'oa-3',
    title: '代理中心',
    summary: '查看团队规模、等级与佣金比例。',
    to: '/h5/agent',
    badge: '代理'
  }
];

export const momentsFeed: MomentItem[] = [
  {
    id: 'moment-1',
    author: '商务对接',
    time: '10 分钟前',
    text: '今天的合作排期已经锁定，晚些会把最终资源位表发到群里。',
    mediaLabel: '排期海报',
    likes: 12,
    comments: 4
  },
  {
    id: 'moment-2',
    author: '运营小晴',
    time: '45 分钟前',
    text: '新人活动文案刚更新，欢迎大家帮忙看看引导路径是否顺手。',
    mediaLabel: '活动预览图',
    likes: 28,
    comments: 9
  },
  {
    id: 'moment-3',
    author: '渠道伙伴群',
    time: '2 小时前',
    text: '本周渠道复盘整理完成，明天上午统一同步数据结论。',
    mediaLabel: '数据截图',
    likes: 19,
    comments: 6
  }
];

export const channelTopics: ChannelItem[] = [
  {
    id: 'channel-1',
    title: '高转化私域触达模板',
    summary: '围绕拉群、活动通知和用户召回整理的高频沟通模板。',
    tag: '运营',
    heat: '2.4k 在看'
  },
  {
    id: 'channel-2',
    title: '账号安全与风控提醒清单',
    summary: '适合代理团队统一培训和账号巡检执行。',
    tag: '安全',
    heat: '1.8k 在看'
  },
  {
    id: 'channel-3',
    title: '新用户转化活动复盘',
    summary: '快速查看本周活动效果、奖励节奏和复用建议。',
    tag: '增长',
    heat: '3.1k 在看'
  }
];

export const favoriteItems: FavoriteItem[] = [
  {
    id: 'fav-1',
    title: '代理活动结算口径',
    summary: '上周同步的结算规则与活动奖励说明。',
    category: '文档',
    source: '系统通知'
  },
  {
    id: 'fav-2',
    title: '商务排期确认话术',
    summary: '适合对外确认排期、价格和资源位的固定话术。',
    category: '消息',
    source: '商务对接'
  },
  {
    id: 'fav-3',
    title: '安全巡检周报',
    summary: '本周账号、设备和风险预警的汇总记录。',
    category: '文件',
    source: '安全中心'
  }
];

export const cardWalletItems: CardWalletItem[] = [
  {
    id: 'card-1',
    title: '渠道合作专享券',
    description: '满 500 减 60，可用于合作服务采购。',
    status: '7 天后到期'
  },
  {
    id: 'card-2',
    title: '高级代理身份卡',
    description: '用于展示代理等级、团队规模与佣金比例。',
    status: '长期有效'
  },
  {
    id: 'card-3',
    title: '平台活动邀请码',
    description: '支持扫码分享给新成员参与平台活动。',
    status: '剩余 38 次'
  }
];

export const stickerPacks: StickerPackItem[] = [
  {
    id: 'sticker-1',
    title: '柬单聊默认表情',
    description: '适合日常沟通、确认和提醒场景。',
    downloads: '18.2k',
    installed: true
  },
  {
    id: 'sticker-2',
    title: '商务确认包',
    description: '适合报价、跟进、确认合作等高频话术。',
    downloads: '9.6k',
    installed: true
  },
  {
    id: 'sticker-3',
    title: '活动冲刺包',
    description: '适合活动提醒、拉新冲量和团队激励。',
    downloads: '12.4k',
    installed: false
  }
];

export const searchEntries: SearchEntry[] = [
  {
    id: 'search-1',
    title: '商务对接',
    subtitle: '联系人 · 渠道合作窗口',
    type: '联系人',
    to: '/h5/chat/demo-business'
  },
  {
    id: 'search-2',
    title: '渠道伙伴群',
    subtitle: '群聊 · 渠道活动沟通群',
    type: '群聊',
    to: '/h5/chat/demo-agency'
  },
  {
    id: 'search-3',
    title: '系统通知',
    subtitle: '服务 · 公告与风控统一入口',
    type: '服务',
    to: '/h5/system-notice'
  },
  {
    id: 'search-4',
    title: '钱包',
    subtitle: '服务 · 余额、收付款和账单',
    type: '服务',
    to: '/h5/wallet'
  },
  {
    id: 'search-5',
    title: '高转化私域触达模板',
    subtitle: '内容 · 看一看频道推荐',
    type: '内容',
    to: '/h5/discover/channels'
  }
];

export const serviceSections = [
  {
    title: '资金服务',
    items: [
      { title: '钱包', subtitle: '查看余额、账单与收付款', to: '/h5/wallet' },
      { title: '收益', subtitle: '查看今日、本周、本月收益', to: '/h5/earnings' }
    ]
  },
  {
    title: '业务服务',
    items: [
      { title: '代理中心', subtitle: '管理团队、等级与佣金', to: '/h5/agent' },
      { title: '系统通知', subtitle: '统一查看公告和风控结果', to: '/h5/system-notice' }
    ]
  },
  {
    title: '账号服务',
    items: [
      { title: '个人资料', subtitle: '查看基础资料和账号信息', to: '/h5/profile' },
      { title: '安全中心', subtitle: '管理登录与设备安全', to: '/h5/security' },
      { title: '设置', subtitle: '语言、登录和辅助开关', to: '/h5/settings' }
    ]
  }
] as const;

export const scanShortcuts = [
  { title: '扫二维码加好友', to: '/h5/contacts/friends' },
  { title: '扫码进入收付款', to: '/h5/wallet' },
  { title: '识别活动海报', to: '/h5/discover/channels' }
] as const;
