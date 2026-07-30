import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const brandingResponse = {
  mobile: {
    platformGroup: 'mobile',
    projectName: '柬单聊移动品牌',
    logoUrl: null,
    themeAssetUrl: 'https://assets.jianliao.local/mobile-theme.png',
    holidayThemeAssetUrl: 'https://assets.jianliao.local/mobile-horse-theme.png'
  },
  pc: {
    platformGroup: 'pc',
    projectName: '柬单聊 PC 品牌',
    logoUrl: null,
    themeAssetUrl: 'https://assets.jianliao.local/pc-theme.png',
    holidayThemeAssetUrl: null
  }
};

const createGroupMembers = () => [
  {
    userId: 'user-demo-1',
    name: '演示用户',
    phone: '855010100000',
    role: 'OWNER',
    isSelf: true
  },
  {
    userId: 'user-demo-2',
    name: '商务对接',
    phone: '855010100002',
    role: 'MEMBER',
    isSelf: false
  },
  {
    userId: 'user-demo-3',
    name: '渠道伙伴群',
    phone: '855010100003',
    role: 'MEMBER',
    isSelf: false
  }
] as const;

const resolveScanPayload = (payload: string) => {
  const normalized = payload.trim().toLowerCase();
  const matchedFriend = normalized.match(/friend:([0-9]+)/);

  if (matchedFriend) {
    return {
      code: `friend:${matchedFriend[1]}`,
      title: '识别到好友二维码',
      description: '当前图片已解析为好友二维码，可前往新的朋友页继续处理。',
      to: '/h5/contacts/friends',
      actionLabel: '去添加朋友',
      source: 'image'
    };
  }

  if (normalized.includes('wallet:')) {
    return {
      code: 'wallet:collect',
      title: '识别到收付款码',
      description: '当前图片已解析为钱包入口，可继续查看余额、账单和收付款。',
      to: '/h5/wallet',
      actionLabel: '前往钱包',
      source: 'image'
    };
  }

  if (normalized.includes('poster:')) {
    return {
      code: 'poster:new-user-campaign',
      title: '识别到活动海报',
      description: '当前图片已解析为活动素材，可继续前往看一看查看推荐内容。',
      to: '/h5/discover/channels',
      actionLabel: '查看活动内容',
      source: 'image'
    };
  }

  return {
    code: payload.trim() || 'demo:search',
    title: '识别到普通内容',
    description: '当前图片已完成解析，可继续前往搜一搜查看关联内容。',
    to: '/h5/discover/search',
    actionLabel: '去搜一搜',
    source: 'image'
  };
};

describe('App route entry', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
    let groupMembers = createGroupMembers().map((item) => ({ ...item }));
    let profileSummary = {
      displayName: '演示账号',
      phone: '855010100000',
      memberSince: '2026-07-01',
      safetyLevel: '标准保护',
      avatarUrl: 'https://assets.jianliao.local/avatar-demo.png'
    };
    let securityDevices = [
      {
        deviceId: 'web-preview-device',
        platform: 'H5',
        lastActiveAt: '2026-07-30T10:00:00.000Z',
        isCurrent: true,
        status: '当前设备'
      },
      {
        deviceId: 'ios-1',
        platform: 'IOS',
        lastActiveAt: '2026-07-29T20:00:00.000Z',
        isCurrent: false,
        status: '已登录'
      }
    ];
    let securityBlacklist = [
      {
        phone: '855010188003',
        name: '风控专员 May',
        blockedAt: '2026-07-30T08:00:00.000Z',
        reason: '已关闭临时通知同步'
      }
    ];
    let privacySettings = {
      discoverableByPhone: true,
      requireFriendRequestNote: true,
      allowGroupInvite: true,
      showReadReceipts: false
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || 'GET';
        if (url.endsWith('/api/profile/summary') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => profileSummary
          });
        }

        if (url.endsWith('/api/profile') && method === 'POST') {
          const payload = JSON.parse(String(init?.body || '{}')) as { displayName?: string; avatarUrl?: string };
          profileSummary = {
            ...profileSummary,
            displayName: payload.displayName || profileSummary.displayName,
            avatarUrl: payload.avatarUrl === undefined ? profileSummary.avatarUrl : payload.avatarUrl || null
          };
          return Promise.resolve({
            ok: true,
            json: async () => profileSummary
          });
        }

        if (url.endsWith('/api/security/devices') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => securityDevices
          });
        }

        if (url.endsWith('/api/security/blacklist') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => securityBlacklist
          });
        }

        if (url.endsWith('/api/security/blacklist/remove') && method === 'POST') {
          const payload = JSON.parse(String(init?.body || '{}')) as { targetPhone?: string };
          securityBlacklist = securityBlacklist.filter((item) => item.phone !== payload.targetPhone);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              targetPhone: payload.targetPhone || '',
              remainingCount: securityBlacklist.length
            })
          });
        }

        if (url.endsWith('/api/security/privacy') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => privacySettings
          });
        }

        if (url.endsWith('/api/security/privacy') && method === 'POST') {
          const payload = JSON.parse(String(init?.body || '{}')) as Partial<typeof privacySettings>;
          privacySettings = {
            ...privacySettings,
            ...payload
          };
          return Promise.resolve({
            ok: true,
            json: async () => privacySettings
          });
        }

        if (url.endsWith('/api/security/scan/resolve') && method === 'POST') {
          const payload = JSON.parse(String(init?.body || '{}')) as { textContent?: string; fileName?: string };
          return Promise.resolve({
            ok: true,
            json: async () => resolveScanPayload(payload.textContent || payload.fileName || '')
          });
        }

        if (url.endsWith('/api/contacts') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'contact-1',
                name: '商务对接',
                phone: '855010100002',
                note: '',
                relationship: 'FRIEND',
                tags: [{ id: 'tag-1', title: '渠道合作' }]
              },
              {
                id: 'contact-2',
                name: '安全专员',
                phone: '855010100004',
                note: '',
                relationship: 'FRIEND',
                tags: [{ id: 'tag-2', title: '安全与风控' }]
              }
            ]
          });
        }

        if (url.includes('/api/contacts/friend-requests') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'friend-1',
                name: '阿杰商务',
                phone: '855010188001',
                note: '通过渠道会认识你，想拉你进合作对接群。',
                status: '待通过'
              },
              {
                id: 'friend-2',
                name: '风控专员 May',
                phone: '855010188003',
                note: '你已通过企业认证，可以直接同步安全设置提醒。',
                status: '已添加'
              }
            ]
          });
        }

        if (url.endsWith('/api/contacts/friend-requests') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'friend-created',
              name: '渠道伙伴群',
              phone: '855010100003',
              note: '你好，想加你为好友。',
              status: '待通过'
            })
          });
        }

        if (url.includes('/api/contacts/friend-requests/') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'friend-1',
              name: '阿杰商务',
              phone: '855010188001',
              note: '通过渠道会认识你，想拉你进合作对接群。',
              status: '已添加'
            })
          });
        }

        if (url.includes('/api/contacts/profile/') && method === 'GET') {
          const targetPhone = decodeURIComponent(url.split('/api/contacts/profile/')[1] || '').split('?')[0];
          const profileMap: Record<string, Record<string, unknown>> = {
            '855010100002': {
              id: 'contact-1',
              name: '商务对接',
              phone: '855010100002',
              note: '重点商务沟通窗口',
              relationship: 'FRIEND',
              tags: [{ id: 'tag-1', title: '渠道合作' }],
              requestId: 'friend-accepted',
              requestNote: '长期合作沟通',
              canSendMessage: true,
              canSendRequest: false
            },
            '855010100003': {
              id: 'contact-3',
              name: '渠道伙伴群',
              phone: '855010100003',
              note: '你好，想加你为好友。',
              relationship: 'NONE',
              tags: [],
              requestId: null,
              requestNote: '',
              canSendMessage: false,
              canSendRequest: true
            }
          };
          return Promise.resolve({
            ok: true,
            json: async () => profileMap[targetPhone] || profileMap['855010100003']
          });
        }

        if (url.includes('/api/contacts/profile/') && method === 'POST') {
          if (url.endsWith('/delete')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ ok: true, status: 'REMOVED' })
            });
          }
          if (url.endsWith('/block')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ ok: true, status: 'BLOCKED' })
            });
          }
          if (url.endsWith('/report')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ id: 'report-1', status: 'OPEN' })
            });
          }
        }

        if (url.includes('/api/contacts/tags') && method === 'GET') {
          if (url.includes('/members')) {
            return Promise.resolve({
              ok: true,
              json: async () => [
                { id: 'contact-1', name: '商务对接', phone: '855010100002' },
                { id: 'contact-3', name: '渠道伙伴群', phone: '855010100003' },
                { id: 'contact-6', name: '运营小晴', phone: '855010188002' }
              ]
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'tag-1',
                title: '渠道合作',
                count: 3,
                members: [
                  { id: 'contact-1', name: '商务对接', phone: '855010100002' },
                  { id: 'contact-3', name: '渠道伙伴群', phone: '855010100003' },
                  { id: 'contact-6', name: '运营小晴', phone: '855010188002' }
                ],
                note: '用于日常合作、活动排期和投放沟通。'
              },
              {
                id: 'tag-2',
                title: '安全与风控',
                count: 2,
                members: [
                  { id: 'contact-2', name: '安全专员', phone: '855010100004' },
                  { id: 'contact-7', name: '风控专员 May', phone: '855010188003' }
                ],
                note: '统一查看账号、设备、风控和告警相关联系人。'
              }
            ]
          });
        }

        if (url.includes('/api/contacts/tags') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'tag-created',
              title: '重点跟进',
              count: 0,
              members: [],
              note: '新建标签，后续可继续补充成员。'
            })
          });
        }

        if (url.includes('/api/contacts/tags/') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ok: true })
          });
        }

        if (url.includes('/api/search')) {
          const keyword = new URL(url, 'http://localhost').searchParams.get('keyword') || '';
          const rows = [
            {
              id: 'search-1',
              title: '商务对接',
              subtitle: '联系人 · 855010100002',
              type: '联系人',
              to: '/h5/contacts/profile/855010100002'
            },
            {
              id: 'search-2',
              title: '钱包',
              subtitle: '服务 · 余额、收付款和账单',
              type: '服务',
              to: '/h5/wallet'
            }
          ];
          return Promise.resolve({
            ok: true,
            json: async () => rows.filter((item) => `${item.title} ${item.subtitle}`.includes(keyword))
          });
        }

        if (url.includes('/api/conversations/group') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'preview-group-test',
              type: 'GROUP',
              title: '测试群聊',
              lastMessage: null,
              updatedAt: new Date().toISOString()
            })
          });
        }

        if (url.includes('/api/conversations/preview-group-agency/members') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => groupMembers
          });
        }

        if (url.includes('/api/conversations/preview-group-agency/invite') && method === 'POST') {
          const payload = JSON.parse(String(init?.body || '{}')) as { memberPhones?: string[] };
          const additions = [
            { phone: '855010100004', name: '安全专员' },
            { phone: '855010188001', name: '阿杰商务' },
            { phone: '855010188002', name: '运营小晴' },
            { phone: '855010188003', name: '风控专员 May' }
          ];
          (payload.memberPhones || []).forEach((phone) => {
            if (groupMembers.some((item) => item.phone === phone)) return;
            const matched = additions.find((item) => item.phone === phone);
            if (!matched) return;
            groupMembers.push({
              userId: `member-${phone}`,
              name: matched.name,
              phone,
              role: 'MEMBER',
              isSelf: false
            });
          });
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'preview-group-agency',
              invitedCount: (payload.memberPhones || []).length
            })
          });
        }

        if (url.includes('/api/conversations/preview-group-agency/leave') && method === 'POST') {
          groupMembers = groupMembers.filter((item) => item.phone !== '855010100000');
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'preview-group-agency',
              left: true
            })
          });
        }

        if (url.includes('/api/conversations')) {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }

        if (url.includes('/api/messages')) {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }

        const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;

        return Promise.resolve({
          ok: true,
          json: async () => row
        });
      })
    );
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  const renderAt = (path: string, options?: { token?: string }) => {
    if (options?.token) {
      window.localStorage.setItem('jianliao_access_token', options.token);
    }

    return render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    );
  };

  it('redirects unauthenticated /h5/messages to login and allows switching to register then back', async () => {
    renderAt('/h5/messages');
    expect(await screen.findByText('柬单聊移动品牌')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册账号' })).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '顶部品牌区' })).toHaveTextContent('柬单聊移动品牌');
    expect(screen.getByRole('region', { name: '中部登录区' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: '底部辅助区' })).toBeInTheDocument();
    expect(screen.getByLabelText('账号')).toHaveAttribute('placeholder', '请输入账号');
    expect(screen.getByRole('button', { name: '记住密码' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全球语言切换' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '注册账号' }));

    expect(screen.getByRole('button', { name: '注册并进入' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已有账号？去登录' })).toBeInTheDocument();
    expect(screen.getByLabelText('昵称')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '已有账号？去登录' }));

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.queryByLabelText('昵称')).not.toBeInTheDocument();
  });

  it('renders protected tab routes with token and allows tab navigation', async () => {
    renderAt('/h5/messages', { token: 'demo-token' });

    expect(await screen.findByRole('heading', { level: 1, name: '消息' })).toBeInTheDocument();
    expect(screen.getByText('暂无会话')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '通讯录' }));
    expect(await screen.findByRole('heading', { level: 1, name: '通讯录' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '发现' }));
    expect(await screen.findByRole('heading', { level: 1, name: '发现' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '我的' }));
    expect(await screen.findByRole('heading', { level: 1, name: '我的' })).toBeInTheDocument();
  });

  it('shows unread badge in message list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || 'GET';
        if (url.includes('/api/conversations') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'demo-business',
                type: 'DM',
                title: '商务对接',
                lastMessage: '这里有 2 条未读',
                updatedAt: '2026-07-30T12:00:00.000Z',
                unreadCount: 2
              }
            ]
          });
        }

        if (url.includes('/api/messages') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }

        const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;
        return Promise.resolve({
          ok: true,
          json: async () => row
        });
      })
    );

    renderAt('/h5/messages', { token: 'demo-token' });

    expect(await screen.findByText('2')).toHaveClass('conversation-unread-badge');
  });

  it('sends image messages from chat page', async () => {
    const messages = [
      {
        id: 'message-1',
        conversationId: 'demo-business',
        senderId: 'peer',
        type: 'TEXT',
        body: { text: '你好，这里是商务对接窗口。' },
        createdAt: '2026-07-30T12:00:00.000Z'
      }
    ];
    const mockedFetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || 'GET';

        if (url.includes('/api/messages?conversationId=demo-business') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => messages
          });
        }

        if (url.includes('/api/messages/read') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              conversationId: 'demo-business',
              unreadCount: 0,
              status: 'acknowledged'
            })
          });
        }

        if (url.includes('/api/files/upload-binary') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              fileId: 'file-image-1',
              url: '/api/files/file-image-1/content',
              mime: 'image/png',
              size: 4,
              width: 96,
              height: 96,
              durationMs: null,
              transcoded: false
            })
          });
        }

        if (url.includes('/api/messages') && method === 'POST') {
          const payload = JSON.parse(String(init?.body || '{}')) as { type?: string; body?: Record<string, unknown> };
          messages.push({
            id: 'message-image-1',
            conversationId: 'demo-business',
            senderId: 'self',
            type: payload.type || 'IMAGE',
            body: payload.body || {},
            createdAt: '2026-07-30T12:01:00.000Z'
          });
          return Promise.resolve({
            ok: true,
            json: async () => messages[messages.length - 1]
          });
        }

        if (url.includes('/api/conversations') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'demo-business',
                type: 'DM',
                title: '商务对接',
                lastMessage: '[图片消息]',
                updatedAt: '2026-07-30T12:01:00.000Z',
                unreadCount: 0
              }
            ]
          });
        }

        const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;
        return Promise.resolve({
          ok: true,
          json: async () => row
        });
      });
    vi.stubGlobal('fetch', mockedFetch);

    renderAt('/h5/chat/demo-business', { token: 'demo-token' });
    const file = new File(['demo'], 'proof.png', { type: 'image/png' });
    const input = await screen.findByLabelText('发送图片');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(
        mockedFetch.mock.calls.some(
          ([requestUrl, init]) => String(requestUrl).includes('/api/files/upload-binary') && init?.method === 'POST'
        )
      ).toBe(true);
    });
    await waitFor(() => {
      expect(
        mockedFetch.mock.calls.some(([requestUrl, init]) => {
          if (!String(requestUrl).endsWith('/api/messages') || init?.method !== 'POST' || typeof init.body !== 'string') {
            return false;
          }
          return JSON.parse(init.body).type === 'IMAGE';
        })
      ).toBe(true);
    });
  });

  it('sends audio messages from chat page', async () => {
    const messages: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || 'GET';

        if (url.includes('/api/messages?conversationId=demo-business') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => messages
          });
        }

        if (url.includes('/api/messages/read') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              conversationId: 'demo-business',
              unreadCount: 0
            })
          });
        }

        if (url.includes('/api/files/upload-binary') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              fileId: 'file-audio-1',
              url: '/api/files/file-audio-1/content',
              mime: 'audio/aac',
              size: 8,
              width: null,
              height: null,
              durationMs: 3_000,
              transcoded: true
            })
          });
        }

        if (url.includes('/api/messages') && method === 'POST') {
          const payload = JSON.parse(String(init?.body || '{}')) as { type?: string; body?: Record<string, unknown> };
          messages.push({
            id: 'message-audio-1',
            conversationId: 'demo-business',
            senderId: 'self',
            type: payload.type || 'AUDIO',
            body: payload.body || {},
            createdAt: '2026-07-30T12:01:00.000Z'
          });
          return Promise.resolve({
            ok: true,
            json: async () => messages[messages.length - 1]
          });
        }

        if (url.includes('/api/conversations') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }

        const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;
        return Promise.resolve({
          ok: true,
          json: async () => row
        });
      })
    );

    renderAt('/h5/chat/demo-business', { token: 'demo-token' });
    const file = new File(['demo audio'], 'voice.m4a', { type: 'audio/mp4' });
    const input = await screen.findByLabelText('发送语音');
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('3 秒')).toBeInTheDocument();
  });

  it('marks conversation as read after opening chat', async () => {
    const mockedFetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (url.includes('/api/messages?conversationId=demo-business') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }

      if (url.includes('/api/messages/read') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            conversationId: 'demo-business',
            unreadCount: 0,
            status: 'acknowledged'
          })
        });
      }

      if (url.includes('/api/conversations') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => []
        });
      }

      const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;
      return Promise.resolve({
        ok: true,
        json: async () => row
      });
    });
    vi.stubGlobal('fetch', mockedFetch);

    renderAt('/h5/chat/demo-business', { token: 'demo-token' });

    expect(await screen.findByRole('heading', { level: 1, name: '商务对接' })).toBeInTheDocument();
    expect(
      mockedFetch.mock.calls.some(
        ([input, init]) => String(input).includes('/api/messages/read') && init?.method === 'POST'
      )
    ).toBe(true);
  });

  it('keeps demo conversations visible when preview auth expires', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method || 'GET';

        if (url.includes('/api/auth/login/password') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              accessToken: 'preview-token'
            })
          });
        }

        if (url.includes('/api/auth/register') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              accessToken: 'preview-token'
            })
          });
        }

        if (url.includes('/api/conversations')) {
          return Promise.resolve({
            ok: false,
            status: 401
          });
        }

        if (url.includes('/api/messages')) {
          return Promise.resolve({
            ok: true,
            json: async () => []
          });
        }

        const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;

        return Promise.resolve({
          ok: true,
          json: async () => row
        });
      })
    );

    renderAt('/h5/messages?preview=demo');

    expect(await screen.findByRole('link', { name: /系统通知/ })).toBeInTheDocument();
    expect(
      screen.getByText('会话列表接口暂不可用，当前展示降级 IM 演示会话。')
    ).toBeInTheDocument();
    expect(screen.queryByText('登录状态已失效，请重新登录')).not.toBeInTheDocument();
  });

  it('opens the contacts service pages', async () => {
    const routes = [
      { path: '/h5/contacts/friends', heading: '新的朋友' },
      { path: '/h5/contacts/profile/855010100002', heading: '联系人资料' },
      { path: '/h5/contacts/groups', heading: '群聊' },
      { path: '/h5/contacts/tags', heading: '标签' },
      { path: '/h5/contacts/official-accounts', heading: '公众号' }
    ];

    for (const [index, route] of routes.entries()) {
      if (index > 0) cleanup();
      renderAt(route.path, { token: 'demo-token' });
      expect(await screen.findByRole('heading', { level: 1, name: route.heading })).toBeInTheDocument();
    }
  });

  it('loads and accepts friend requests from api', async () => {
    renderAt('/h5/contacts/friends', { token: 'demo-token' });

    expect((await screen.findAllByRole('button', { name: '通过' })).length).toBeGreaterThan(0);
    expect(screen.getByText('手机号添加入口')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '通过' })[0]);
    expect((await screen.findAllByRole('button', { name: '已通过' })).length).toBeGreaterThan(0);
  });

  it('renders wechat-style contacts entry rows', async () => {
    renderAt('/h5/contacts', { token: 'demo-token' });

    expect(await screen.findByRole('link', { name: /新的朋友/ })).toHaveAttribute('href', '/h5/contacts/friends');
    expect(screen.getByRole('link', { name: /群聊/ })).toHaveAttribute('href', '/h5/contacts/groups');
    expect(screen.getByRole('link', { name: /标签/ })).toHaveAttribute('href', '/h5/contacts/tags');
    expect(screen.getByRole('link', { name: /添加朋友/ })).toHaveAttribute('href', '/h5/discover/search');
    expect(screen.getByRole('link', { name: /公众号/ })).toHaveAttribute(
      'href',
      '/h5/contacts/official-accounts'
    );
  });

  it('loads, filters and creates tags from api', async () => {
    renderAt('/h5/contacts/tags', { token: 'demo-token' });

    fireEvent.change(await screen.findByLabelText('搜索标签或联系人'), {
      target: { value: '安全' }
    });
    expect(screen.getByText('安全与风控')).toBeInTheDocument();
    expect(screen.queryByText('渠道合作')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('新标签名称'), {
      target: { value: '重点跟进' }
    });
    fireEvent.click(screen.getByRole('button', { name: '新建标签' }));
    fireEvent.change(screen.getByLabelText('搜索标签或联系人'), {
      target: { value: '' }
    });
    expect(await screen.findByText('重点跟进')).toBeInTheDocument();
  });

  it('manages tag members from api', async () => {
    renderAt('/h5/contacts/tags', { token: 'demo-token' });

    expect((await screen.findAllByText('商务对接')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('选择 渠道合作 的联系人'), {
      target: { value: '855010100004' }
    });
    fireEvent.click(screen.getAllByRole('button', { name: '添加成员' })[0]);
    expect((await screen.findAllByText('安全专员')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: '移出' })[0]);
  });

  it('shows contact profile actions and sends report', async () => {
    renderAt('/h5/contacts/profile/855010100002', { token: 'demo-token' });

    expect(await screen.findByText('当前状态：好友')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发消息' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除好友' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拉黑' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '提交举报' }));
    expect(await screen.findByText('已提交对 商务对接 的举报。')).toBeInTheDocument();
  });

  it('sends friend request from contact profile', async () => {
    renderAt('/h5/contacts/profile/855010100003', { token: 'demo-token' });

    expect(await screen.findByRole('button', { name: '发送好友申请' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '发送好友申请' }));
    expect(await screen.findByText('渠道伙伴群 的好友申请已发送。')).toBeInTheDocument();
  });

  it('opens the discover service pages', async () => {
    const routes = [
      { path: '/h5/discover/moments', heading: '朋友圈' },
      { path: '/h5/discover/scan', heading: '扫一扫' },
      { path: '/h5/discover/channels', heading: '看一看' },
      { path: '/h5/discover/search', heading: '搜一搜' }
    ];

    for (const [index, route] of routes.entries()) {
      if (index > 0) cleanup();
      renderAt(route.path, { token: 'demo-token' });
      expect(await screen.findByRole('heading', { level: 1, name: route.heading })).toBeInTheDocument();
    }
  });

  it('publishes and likes a moment locally', async () => {
    renderAt('/h5/discover/moments', { token: 'demo-token' });

    fireEvent.change(await screen.findByLabelText('动态内容'), {
      target: { value: '今天把四个 Tab 的剩余交互补齐了' }
    });
    fireEvent.click(screen.getByRole('button', { name: '发布动态' }));
    expect(screen.getByText('今天把四个 Tab 的剩余交互补齐了')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /赞/ })[0]);
    expect(screen.getAllByRole('button', { name: /赞/ })[0]).toHaveTextContent('1 赞');
  });

  it('loads filtered search results from api', async () => {
    renderAt('/h5/discover/search', { token: 'demo-token' });

    fireEvent.change(await screen.findByLabelText('搜索联系人、群聊、服务或内容'), {
      target: { value: '钱包' }
    });
    expect(await screen.findByRole('link', { name: /钱包/ })).toHaveAttribute('href', '/h5/wallet');
    expect(screen.queryByRole('link', { name: /商务对接/ })).not.toBeInTheDocument();
  });

  it('simulates scan result routing', async () => {
    renderAt('/h5/discover/scan', { token: 'demo-token' });

    fireEvent.click(await screen.findByRole('button', { name: '收付款码' }));
    expect(screen.getByText('识别到收付款码')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '前往钱包' })).toHaveAttribute('href', '/h5/wallet');
  });

  it('uploads scan image and resolves result', async () => {
    renderAt('/h5/discover/scan', { token: 'demo-token' });

    const file = new File(['wallet:collect'], 'wallet:collect.png', { type: 'image/png' });
    const input = await screen.findByLabelText('上传二维码图片');
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('识别到收付款码')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '前往钱包' })).toHaveAttribute('href', '/h5/wallet');
  });

  it('renders wechat-style discover rows', async () => {
    renderAt('/h5/discover', { token: 'demo-token' });

    expect(await screen.findByRole('link', { name: /朋友圈/ })).toHaveAttribute('href', '/h5/discover/moments');
    expect(screen.getByRole('link', { name: /扫一扫/ })).toHaveAttribute('href', '/h5/discover/scan');
    expect(screen.getByRole('link', { name: /看一看/ })).toHaveAttribute('href', '/h5/discover/channels');
    expect(screen.getByRole('link', { name: /搜一搜/ })).toHaveAttribute('href', '/h5/discover/search');
  });

  it('opens the me service pages', async () => {
    const routes = [
      { path: '/h5/me/services', heading: '服务' },
      { path: '/h5/me/favorites', heading: '收藏' },
      { path: '/h5/me/cards', heading: '卡包' },
      { path: '/h5/me/stickers', heading: '表情' }
    ];

    for (const [index, route] of routes.entries()) {
      if (index > 0) cleanup();
      renderAt(route.path, { token: 'demo-token' });
      expect(await screen.findByRole('heading', { level: 1, name: route.heading })).toBeInTheDocument();
    }
  });

  it('renders service center links on services page', async () => {
    renderAt('/h5/me/services', { token: 'demo-token' });

    expect(await screen.findByRole('link', { name: /钱包/ })).toHaveAttribute('href', '/h5/wallet');
    expect(screen.getByRole('link', { name: /安全中心/ })).toHaveAttribute('href', '/h5/security');
    expect(screen.getByRole('link', { name: /设置/ })).toHaveAttribute('href', '/h5/settings');
  });

  it('renders wechat-style me sections', async () => {
    renderAt('/h5/me', { token: 'demo-token' });

    expect(await screen.findByRole('link', { name: /服务/ })).toHaveAttribute('href', '/h5/me/services');
    expect(screen.getByRole('link', { name: /卡包/ })).toHaveAttribute('href', '/h5/me/cards');
    expect(screen.getByRole('link', { name: /设置/ })).toHaveAttribute('href', '/h5/settings');
  });

  it('opens the new group flow route', async () => {
    renderAt('/h5/group/new', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '选择联系人' })).toBeInTheDocument();
  });

  it('creates a group from the group flow', async () => {
    renderAt('/h5/group/new', { token: 'demo-token' });

    fireEvent.click(await screen.findByLabelText('选择 商务对接'));
    fireEvent.click(screen.getByLabelText('选择 渠道伙伴群'));
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    fireEvent.change(await screen.findByLabelText('群名称'), {
      target: { value: '测试群聊' }
    });
    fireEvent.click(screen.getByRole('button', { name: '完成' }));

    expect(await screen.findByRole('heading', { level: 1, name: '测试群聊' })).toBeInTheDocument();
  });

  it('opens chat settings page and manages group members', async () => {
    renderAt('/h5/chat/preview-group-agency/settings', { token: 'demo-token' });

    expect(await screen.findByRole('heading', { level: 1, name: '群聊设置' })).toBeInTheDocument();
    expect(screen.getByText('商务对接')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('邀请成员'), {
      target: { value: '855010100004' }
    });
    fireEvent.click(screen.getByRole('button', { name: '邀请成员' }));
    expect(await screen.findByText('安全专员')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '退出群聊' }));
    expect(await screen.findByRole('heading', { level: 1, name: '消息' })).toBeInTheDocument();
  });

  it('renders all extended client sections when authenticated', async () => {
    renderAt('/h5/system-notice', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '系统通知' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/wallet', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '钱包' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/earnings', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '收益' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/agent', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '代理中心' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/profile', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '个人资料' })).toBeInTheDocument();

    cleanup();
    renderAt('/h5/security', { token: 'demo-token' });
    expect(await screen.findByRole('heading', { level: 1, name: '安全中心' })).toBeInTheDocument();
  });

  it('updates profile nickname from profile page', async () => {
    renderAt('/h5/profile', { token: 'demo-token' });

    fireEvent.change(await screen.findByLabelText('昵称'), {
      target: { value: '新的昵称' }
    });
    fireEvent.click(screen.getByRole('button', { name: '保存资料' }));

    expect(await screen.findByText('资料已保存')).toBeInTheDocument();
    expect(screen.getByDisplayValue('新的昵称')).toBeInTheDocument();
  });

  it('loads security settings and removes blacklist contact', async () => {
    renderAt('/h5/security', { token: 'demo-token' });

    expect(await screen.findByText(/web-preview-device/)).toBeInTheDocument();
    expect(screen.getByText('风控专员 May')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '移出 风控专员 May' }));

    await waitFor(() => {
      expect(screen.queryByText('风控专员 May')).not.toBeInTheDocument();
    });
  });

  it('loads settings summary from security api', async () => {
    renderAt('/h5/settings', { token: 'demo-token' });

    expect(await screen.findByText('已登录设备 2 台 · 黑名单 1 人')).toBeInTheDocument();
    expect(screen.getByText('允许手机号搜索')).toBeInTheDocument();
  });

  it('maps /mobile to mobile branding and /PC to pc branding', async () => {
    renderAt('/mobile');

    expect(await screen.findByText('柬单聊移动品牌')).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '顶部品牌区' })).toHaveTextContent('柬单聊移动品牌');

    cleanup();
    renderAt('/PC');

    expect(await screen.findByText('柬单聊 PC 品牌')).toBeInTheDocument();
    expect(screen.getByRole('banner', { name: '顶部品牌区' })).toHaveTextContent('柬单聊 PC 品牌');
  });

  it('renders login page by default on root path', async () => {
    renderAt('/');

    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(await screen.findByText('柬单聊 PC 品牌')).toBeInTheDocument();
  });

  it('keeps login on page when auth request fails and does not write demo token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/auth/login/password')) {
          return Promise.resolve({
            ok: false,
            status: 500
          });
        }

        const row = url.includes('group=mobile') ? brandingResponse.mobile : brandingResponse.pc;
        return Promise.resolve({
          ok: true,
          json: async () => row
        });
      })
    );

    renderAt('/h5/login');
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: '855010100001' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret-123' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('服务暂不可用，请稍后重试')).toBeInTheDocument();
    expect(window.localStorage.getItem('jianliao_access_token')).toBeNull();
  });

  it('renders download page on /app', () => {
    renderAt('/app');
    expect(screen.getByText('柬单聊下载')).toBeInTheDocument();
    expect(screen.getByText('下载安装 Android 版')).toBeInTheDocument();
  });
});
