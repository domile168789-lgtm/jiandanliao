export type BrandingPlatformGroup = 'mobile' | 'pc';

export type BrandingRow = {
  platformGroup: BrandingPlatformGroup;
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
  holidayThemeAssetUrl?: string | null;
};

const FALLBACK_ROWS: BrandingRow[] = [
  {
    platformGroup: 'mobile',
    projectName: '柬单聊移动端',
    logoUrl: 'https://assets.jianliao.local/mobile-logo.png',
    themeAssetUrl: 'https://assets.jianliao.local/mobile-theme.png',
    holidayThemeAssetUrl: null
  },
  {
    platformGroup: 'pc',
    projectName: '柬单聊 PC 网页端',
    logoUrl: 'https://assets.jianliao.local/pc-logo.png',
    themeAssetUrl: 'https://assets.jianliao.local/pc-theme.png',
    holidayThemeAssetUrl: null
  }
];

export const resolveBrandingGroup = (pathname: string): BrandingPlatformGroup => {
  const normalizedPath = pathname.trim().toLowerCase();

  if (normalizedPath.startsWith('/h5') || normalizedPath.startsWith('/mobile')) {
    return 'mobile';
  }

  if (normalizedPath.startsWith('/pc')) {
    return 'pc';
  }

  return 'pc';
};

export const getFallbackBranding = (group: BrandingPlatformGroup): BrandingRow =>
  FALLBACK_ROWS.find((row) => row.platformGroup === group) || FALLBACK_ROWS[0];

const normalizeBrandingRows = (payload: unknown): BrandingRow[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      platformGroup: item.platformGroup === 'mobile' ? 'mobile' : 'pc',
      projectName: typeof item.projectName === 'string' ? item.projectName : '',
      logoUrl: typeof item.logoUrl === 'string' ? item.logoUrl : null,
      themeAssetUrl: typeof item.themeAssetUrl === 'string' ? item.themeAssetUrl : null,
      holidayThemeAssetUrl: typeof item.holidayThemeAssetUrl === 'string' ? item.holidayThemeAssetUrl : null
    }));
};

export async function loadBranding(
  pathname: string,
  fetcher: typeof fetch = fetch
): Promise<BrandingRow> {
  const group = resolveBrandingGroup(pathname);

  try {
    const response = await fetcher(`/api/public/branding?group=${group}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    const payload = await response.json();
    const rows = normalizeBrandingRows([payload]);
    return rows[0] || getFallbackBranding(group);
  } catch {
    return getFallbackBranding(group);
  }
}
