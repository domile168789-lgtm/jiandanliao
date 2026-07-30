export type AdminSession = {
  role: 'SUPER_ADMIN' | 'OPERATOR' | 'AUDITOR';
  id: string;
  username: string;
  accessToken: string;
  baseUrl?: string;
};

const KEY = 'jianliao_admin_session_v1';
const DEFAULT_REMOTE_BASE_URL = 'http://45.202.0.14/api';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const getDefaultBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_REMOTE_BASE_URL;
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') return '/api';
  return DEFAULT_REMOTE_BASE_URL;
};

type StoredAdminSession = AdminSession & {
  apiBaseUrl?: string;
};

const normalizeBaseUrl = (baseUrl?: string) => {
  const trimmed = baseUrl?.trim();
  const fallback = getDefaultBaseUrl();
  if (!trimmed) return fallback;
  return trimmed.replace(/\/+$/, '') || fallback;
};

export const roleLabelMap: Record<AdminSession['role'], string> = {
  SUPER_ADMIN: '超级管理员',
  OPERATOR: '运营管理员',
  AUDITOR: '审计管理员'
};

const normalizeSession = (session: StoredAdminSession | null | undefined): AdminSession | null => {
  if (!session?.role || !session.id || !session.username || !session.accessToken) return null;
  const role = session.role.trim().toUpperCase() as AdminSession['role'];
  const id = session.id.trim();
  const username = session.username.trim();
  const accessToken = session.accessToken.trim();
  if (!id || !username || !accessToken) return null;
  return {
    role,
    id,
    username,
    accessToken,
    baseUrl: normalizeBaseUrl(session.baseUrl || session.apiBaseUrl)
  };
};

const joinBaseUrl = (baseUrl: string | undefined, path: string) => {
  const base = normalizeBaseUrl(baseUrl);
  const normalizedPath =
    base.endsWith('/api') && path.startsWith('/api/') ? path.slice('/api'.length) : path;
  return `${base}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
};

export const loadSession = (): AdminSession | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw) as StoredAdminSession);
  } catch {
    return null;
  }
};

export const saveSession = (session: AdminSession | null) => {
  const normalized = normalizeSession(session);
  if (!normalized) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(normalized));
};

export const request = async <T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    session?: AdminSession | null;
    baseUrl?: string;
    auth?: boolean;
  } = {}
): Promise<T> => {
  const session = init.session ?? loadSession();
  const requireAuth = init.auth ?? true;
  if (requireAuth && !session?.accessToken) throw new ApiError('UNAUTHORIZED', 401, 'UNAUTHORIZED');

  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const hasBody = init.body !== undefined;
  if (hasBody) headers.set('Content-Type', 'application/json');

  const url = joinBaseUrl(init.baseUrl || session.baseUrl, path);
  const res = await fetch(url, {
    method: init.method || 'GET',
    headers,
    body: hasBody ? JSON.stringify(init.body) : undefined
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const code = data?.code;
    throw new ApiError(code || `HTTP_${res.status}`, res.status, code);
  }

  return data as T;
};
