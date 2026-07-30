import { ApiError } from './client';
import { hasPreviewSession } from '../state/session';

export type DataSource = 'live' | 'demo';

export type LoadableData<T> = {
  data: T;
  source: DataSource;
  notice?: string;
};

export const isAuthError = (error: unknown): error is ApiError =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

export const getErrorMessage = (error: unknown, fallback = '请求失败，请稍后重试') => {
  if (error instanceof ApiError) {
    if (error.status === 401) return '登录状态已失效，请重新登录';
    if (error.status === 403) return '当前账号无权访问该内容';
    if (error.status === 404) return '请求的内容不存在';
    if (error.status >= 500) return '服务暂不可用，请稍后重试';
    return `请求失败（${error.status}）`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export async function withDemoFallback<T>(
  loader: () => Promise<T>,
  fallbackData: T,
  notice: string
): Promise<LoadableData<T>> {
  try {
    return {
      data: await loader(),
      source: 'live'
    };
  } catch (error) {
    if (isAuthError(error) && !hasPreviewSession()) {
      throw error;
    }

    return {
      data: fallbackData,
      source: 'demo',
      notice
    };
  }
}
