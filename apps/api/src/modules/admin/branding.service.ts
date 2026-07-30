import { randomUUID } from 'node:crypto';
import { getDb } from '../../db.js';

export type BrandingGroup = 'mobile' | 'pc';
export const DEFAULT_BRANDING_PROJECT_NAME = '柬单聊';

export type BrandingConfig = {
  platformGroup: BrandingGroup;
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
  updatedBy?: string;
  updatedAt?: string | Date;
};

export type BrandingRow = BrandingConfig;

const BRANDING_GROUPS: BrandingGroup[] = ['mobile', 'pc'];

const isBrandingGroup = (value: string): value is BrandingGroup => {
  return BRANDING_GROUPS.includes(value as BrandingGroup);
};

const normalizeProjectName = (value: unknown) => {
  if (typeof value !== 'string') return DEFAULT_BRANDING_PROJECT_NAME;
  const trimmed = value.trim();
  return trimmed || DEFAULT_BRANDING_PROJECT_NAME;
};

const normalizeBrandingRow = (row: Record<string, unknown>): BrandingRow => ({
  platformGroup: row.platformGroup === 'mobile' ? 'mobile' : 'pc',
  projectName: normalizeProjectName(row.projectName),
  logoUrl: typeof row.logoUrl === 'string' ? row.logoUrl : null,
  themeAssetUrl: typeof row.themeAssetUrl === 'string' ? row.themeAssetUrl : null,
  updatedBy: typeof row.updatedBy === 'string' ? row.updatedBy : undefined,
  updatedAt:
    typeof row.updatedAt === 'string' || row.updatedAt instanceof Date ? row.updatedAt : undefined
});

export class BrandingService {
  async list() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT platform_group AS platformGroup,
              project_name AS projectName,
              logo_url AS logoUrl,
              theme_asset_url AS themeAssetUrl,
              holiday_theme_asset_url AS holidayThemeAssetUrl,
              updated_by AS updatedBy,
              updated_at AS updatedAt
       FROM branding_configs
       ORDER BY platform_group ASC`
    );
    return rows.map((row) => normalizeBrandingRow(row));
  }

  async getByGroup(group: BrandingGroup) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT platform_group AS platformGroup,
              project_name AS projectName,
              logo_url AS logoUrl,
              theme_asset_url AS themeAssetUrl,
              holiday_theme_asset_url AS holidayThemeAssetUrl,
              updated_by AS updatedBy,
              updated_at AS updatedAt
       FROM branding_configs
       WHERE platform_group = ?
       LIMIT 1`,
      [group]
    );
    return rows[0] ? normalizeBrandingRow(rows[0]) : null;
  }

  async upsert(input: {
    platformGroup: BrandingGroup;
    projectName: string;
    logoUrl?: string | null;
    themeAssetUrl?: string | null;
    holidayThemeAssetUrl?: string | null;
    adminId: string;
  }) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const db = getDb();
    const updatedAt = new Date();
    const row: BrandingRow = {
      platformGroup: input.platformGroup,
      projectName: normalizeProjectName(input.projectName),
      logoUrl: input.logoUrl ?? null,
      themeAssetUrl: input.themeAssetUrl ?? null,
      updatedBy: input.adminId,
      updatedAt
    };
    const values: [string, BrandingGroup, string, string | null, string | null, string | null, string, Date] =
      [
        randomUUID(),
        row.platformGroup,
        row.projectName,
        row.logoUrl,
        row.themeAssetUrl,
        input.holidayThemeAssetUrl ?? null,
        input.adminId,
        updatedAt
      ];

    await db.execute(
      `INSERT INTO branding_configs (
         id,
         platform_group,
         project_name,
         logo_url,
         theme_asset_url,
         holiday_theme_asset_url,
         updated_by,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         project_name = VALUES(project_name),
         logo_url = VALUES(logo_url),
         theme_asset_url = VALUES(theme_asset_url),
         holiday_theme_asset_url = VALUES(holiday_theme_asset_url),
         updated_by = VALUES(updated_by),
         updated_at = VALUES(updated_at)`,
      values
    );

    return row;
  }

  static isBrandingGroup = isBrandingGroup;
}
