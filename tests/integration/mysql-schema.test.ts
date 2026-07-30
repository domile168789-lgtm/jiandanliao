import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('phase1 mysql schema', () => {
  it('contains announcements reports and conversation member tables', () => {
    const sql = readFileSync(resolve(repoRoot, 'infra/mysql/001_init.sql'), 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS announcements');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS reports');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS conversation_members');
  });

  it('stores jiandanliao-facing branding fields', () => {
    const sql = readFileSync(resolve(repoRoot, 'infra/mysql/001_init.sql'), 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS branding_configs');
    expect(sql).toContain('platform_group VARCHAR(16) NOT NULL UNIQUE');
    expect(sql).toContain("project_name VARCHAR(128) NOT NULL DEFAULT '柬单聊'");
    expect(sql).toContain('logo_url VARCHAR(512) NULL');
    expect(sql).toContain('theme_asset_url VARCHAR(512) NULL');
    expect(sql).toContain('holiday_theme_asset_url VARCHAR(512) NULL');
  });

  it('contains group bot orders and alerts tables', () => {
    const sql = readFileSync(resolve(repoRoot, 'infra/mysql/001_init.sql'), 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS group_product_orders');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS group_bot_alerts');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS group_bot_alert_deliveries');
    expect(sql).toContain('refund_status VARCHAR(24) NOT NULL DEFAULT \'NONE\'');
    expect(sql).toContain('trigger_type VARCHAR(32) NOT NULL');
  });

  it('contains activity center tables', () => {
    const sql = readFileSync(resolve(repoRoot, 'infra/mysql/001_init.sql'), 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS activity_campaigns');
    expect(sql).toContain('activity_type VARCHAR(32) NOT NULL');
    expect(sql).toContain('config_json JSON NOT NULL');
  });
});
