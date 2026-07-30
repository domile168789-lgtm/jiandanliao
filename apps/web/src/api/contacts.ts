import { apiGet, apiPost } from './client';

export type FriendRequestRow = {
  id: string;
  name: string;
  phone: string;
  note: string;
  status: '待通过' | '已添加';
  createdAt?: string;
};

export type ContactTagRow = {
  id: string;
  title: string;
  count: number;
  members: string[];
  note: string;
  createdAt?: string;
};

export type SearchEntryRow = {
  id: string;
  title: string;
  subtitle: string;
  type: '联系人' | '群聊' | '服务' | '内容';
  to: string;
};

export async function loadFriendRequests() {
  return apiGet<FriendRequestRow[]>('/api/contacts/friend-requests');
}

export async function acceptFriendRequest(requestId: string) {
  return apiPost<FriendRequestRow>(`/api/contacts/friend-requests/${requestId}/accept`, {});
}

export async function loadContactTags() {
  return apiGet<ContactTagRow[]>('/api/contacts/tags');
}

export async function createContactTag(title: string) {
  return apiPost<ContactTagRow>('/api/contacts/tags', { title });
}

export async function searchHub(keyword: string) {
  const query = new URLSearchParams();
  if (keyword.trim()) {
    query.set('keyword', keyword.trim());
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiGet<SearchEntryRow[]>(`/api/search${suffix}`);
}
