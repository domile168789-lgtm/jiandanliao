import { apiGet, apiPost } from './client';

export type ContactTagSummary = {
  id: string;
  title: string;
};

export type ContactMemberRow = {
  id: string;
  name: string;
  phone: string;
};

export type ContactRow = {
  id: string;
  name: string;
  phone: string;
  tags: ContactTagSummary[];
  note: string;
  relationship: 'SELF' | 'FRIEND' | 'PENDING_INCOMING' | 'PENDING_OUTGOING' | 'BLOCKED' | 'NONE';
};

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
  members: ContactMemberRow[];
  note: string;
  createdAt?: string;
};

export type ContactProfileRow = ContactRow & {
  requestId: string | null;
  requestNote: string;
  canSendMessage: boolean;
  canSendRequest: boolean;
};

export type SearchEntryRow = {
  id: string;
  title: string;
  subtitle: string;
  type: '联系人' | '群聊' | '服务' | '内容';
  to: string;
};

export async function loadContacts() {
  return apiGet<ContactRow[]>('/api/contacts');
}

export async function loadFriendRequests() {
  return apiGet<FriendRequestRow[]>('/api/contacts/friend-requests');
}

export async function sendFriendRequest(targetPhone: string, note: string) {
  return apiPost<FriendRequestRow>('/api/contacts/friend-requests', { targetPhone, note });
}

export async function acceptFriendRequest(requestId: string) {
  return apiPost<FriendRequestRow>(`/api/contacts/friend-requests/${requestId}/accept`, {});
}

export async function loadContactProfile(targetPhone: string) {
  return apiGet<ContactProfileRow>(`/api/contacts/profile/${encodeURIComponent(targetPhone)}`);
}

export async function deleteContact(targetPhone: string) {
  return apiPost<{ ok: true; status: 'REMOVED' }>(`/api/contacts/profile/${encodeURIComponent(targetPhone)}/delete`, {});
}

export async function blockContact(targetPhone: string) {
  return apiPost<{ ok: true; status: 'BLOCKED' }>(`/api/contacts/profile/${encodeURIComponent(targetPhone)}/block`, {});
}

export async function reportContact(targetPhone: string, reason: string) {
  return apiPost<{ id: string; status: 'OPEN' }>(`/api/contacts/profile/${encodeURIComponent(targetPhone)}/report`, {
    reason
  });
}

export async function loadContactTags() {
  return apiGet<ContactTagRow[]>('/api/contacts/tags');
}

export async function createContactTag(title: string) {
  return apiPost<ContactTagRow>('/api/contacts/tags', { title });
}

export async function loadTagMembers(tagId: string) {
  return apiGet<ContactMemberRow[]>(`/api/contacts/tags/${encodeURIComponent(tagId)}/members`);
}

export async function addTagMember(tagId: string, contactPhone: string) {
  return apiPost<{ ok: true }>(`/api/contacts/tags/${encodeURIComponent(tagId)}/members`, {
    contactPhone
  });
}

export async function removeTagMember(tagId: string, contactPhone: string) {
  return apiPost<{ ok: true }>(`/api/contacts/tags/${encodeURIComponent(tagId)}/members/remove`, {
    contactPhone
  });
}

export async function searchHub(keyword: string) {
  const query = new URLSearchParams();
  if (keyword.trim()) {
    query.set('keyword', keyword.trim());
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiGet<SearchEntryRow[]>(`/api/search${suffix}`);
}
