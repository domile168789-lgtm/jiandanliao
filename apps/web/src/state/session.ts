const ACCESS_TOKEN_KEY = 'jianliao_access_token';
const PREVIEW_SESSION_KEY = 'jianliao_preview_session';

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
}

export function getAccessToken(): string | null {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string) {
  getStorage()?.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  getStorage()?.removeItem(ACCESS_TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

export function setPreviewSessionEnabled(enabled: boolean) {
  const storage = getStorage();
  if (!storage) return;

  if (enabled) {
    storage.setItem(PREVIEW_SESSION_KEY, '1');
    return;
  }

  storage.removeItem(PREVIEW_SESSION_KEY);
}

export function hasPreviewSession() {
  return getStorage()?.getItem(PREVIEW_SESSION_KEY) === '1';
}
