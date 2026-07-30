import { clearAccessToken, getAccessToken } from '../state/session';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const applyDefaultHeaders = (headers?: HeadersInit, withJsonBody = false) => {
  const nextHeaders = new Headers(headers);
  nextHeaders.set('Accept', 'application/json');

  if (withJsonBody && !nextHeaders.has('Content-Type')) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  return nextHeaders;
};

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch
): Promise<Response> {
  const withJsonBody = init.body != null && !(init.body instanceof FormData);
  const response = await fetcher(path, {
    ...init,
    headers: applyDefaultHeaders(init.headers, withJsonBody)
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }
    throw new ApiError(response.status, `HTTP_${response.status}`);
  }

  return response;
}

export async function apiGet<T>(path: string, fetcher: typeof fetch = fetch): Promise<T> {
  const response = await apiFetch(
    path,
    {
      method: 'GET'
    },
    fetcher
  );

  return (await response.json()) as T;
}

export async function apiPost<TResponse>(
  path: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch
): Promise<TResponse> {
  const response = await apiFetch(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body)
    },
    fetcher
  );

  return (await response.json()) as TResponse;
}
