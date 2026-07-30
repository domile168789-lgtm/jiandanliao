import React, { useEffect, useMemo, useState } from 'react';
import {
  getBrandingConfigs,
  updateBranding,
  type BrandingPlatformGroup,
  type BrandingRow
} from '../../api/admin';

type UnifiedBrandingFormState = {
  projectName: string;
  themeAssetUrl: string;
  holidayThemeAssetUrl: string;
};

const FALLBACK_ROWS: BrandingRow[] = [
  {
    platformGroup: 'mobile',
    projectName: '柬聊移动端',
    themeAssetUrl: 'https://assets.jianliao.local/mobile-theme.png',
    holidayThemeAssetUrl: 'https://assets.jianliao.local/mobile-holiday-theme.png'
  },
  {
    platformGroup: 'pc',
    projectName: '柬聊 PC 网页端',
    themeAssetUrl: 'https://assets.jianliao.local/pc-theme.png',
    holidayThemeAssetUrl: 'https://assets.jianliao.local/pc-holiday-theme.png'
  }
];

const rowsToState = (rows: BrandingRow[]): UnifiedBrandingFormState => {
  const merged = rows.length ? rows : FALLBACK_ROWS;
  const preferred =
    merged.find((row) => row.projectName?.trim() || row.themeAssetUrl?.trim()) || merged[0];

  return {
    projectName: preferred?.projectName || '',
    themeAssetUrl: preferred?.themeAssetUrl || '',
    holidayThemeAssetUrl: preferred?.holidayThemeAssetUrl || ''
  };
};

export const BrandingPage = () => {
  const [form, setForm] = useState<UnifiedBrandingFormState>(() => rowsToState(FALLBACK_ROWS));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getBrandingConfigs();
      setForm(rowsToState(rows));
      if (!rows.length) {
        setError('品牌配置接口已接通，但当前没有数据，已展示预置示例。');
      }
    } catch {
      setForm(rowsToState(FALLBACK_ROWS));
      setError('品牌配置接口暂不可用，当前展示本地示例数据。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const syncGroups = useMemo(() => ['mobile', 'pc'] as BrandingPlatformGroup[], []);

  const updateField = (key: keyof UnifiedBrandingFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const onPickImage = () => {
    fileInputRef.current?.click();
  };

  const onSelectImage = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('themeAssetUrl', reader.result);
        setSuccess('主题图片已载入，记得点击保存配置。');
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('图片读取失败，请重新选择图片文件。');
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const results = await Promise.all(
        syncGroups.map((group) =>
          updateBranding(group, {
            projectName: form.projectName.trim(),
            logoUrl: null,
            themeAssetUrl: form.themeAssetUrl.trim() || null,
            holidayThemeAssetUrl: form.holidayThemeAssetUrl.trim() || null
          })
        )
      );
      const saved = results[0];
      setForm({
        projectName: saved.projectName,
        themeAssetUrl: saved.themeAssetUrl || '',
        holidayThemeAssetUrl: saved.holidayThemeAssetUrl || ''
      });
      setSuccess('统一品牌配置已保存，并同步到移动端与 PC 端。');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-section branding-page">
      <div className="page-header">
        <div>
          <div className="section-kicker">品牌中心</div>
          <h1>品牌配置</h1>
          <p className="page-subtitle">统一维护一套品牌名称和主题图片，保存后同步作用到当前所有端，不再分两套后台操作。</p>
        </div>
        <div className="toolbar-actions">
          <span className="pill subtle">{loading ? '拉取配置中...' : '统一同步到所有端'}</span>
          <button onClick={load} disabled={loading}>
            重新拉取
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="ok">{success}</div>}

      <div className="data-source-note">
        数据来源：品牌页优先读取真实接口 `/api/admin/branding`，保存时会同步写回移动端与 PC 端配置；当接口不可用时，页面会回退到本地示例数据并明确提示。
      </div>

      <div className="branding-grid">
        <article className="panel branding-card">
          <div className="panel-header">
            <div>
              <h3>统一品牌配置</h3>
              <p className="muted">这一个管理后台配置会同时作用到 H5、移动端、PC 网页端及当前管理后台展示，不再拆成两套配置卡片。</p>
            </div>
            <span className="pill">single-config</span>
          </div>

          <div className="field">
            <label>品牌名称</label>
            <input
              value={form.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              placeholder="请输入品牌名称"
            />
            <span className="field-help">保存后将统一用于所有端的登录页主标题展示。</span>
          </div>

          <div className="field">
            <label>主题图片</label>
            <textarea
              value={form.themeAssetUrl}
              onChange={(e) => updateField('themeAssetUrl', e.target.value)}
              rows={3}
              placeholder="https://... 或上传后自动填写"
            />
            <span className="field-help">可直接填写图片地址，也可以点击上传图片，从本地选择后一键预览与保存。</span>
            <div className="toolbar-actions">
              <input
                ref={fileInputRef}
                className="hidden-file-input"
                type="file"
                accept="image/*"
                onChange={(e) => onSelectImage(e.target.files?.[0])}
              />
              <button type="button" onClick={onPickImage}>
                上传图片
              </button>
              <span className="field-help">当前会把同一张图同步到移动端和 PC 端主题位。</span>
            </div>
          </div>

          <div className="field">
            <label>节假日主题</label>
            <textarea
              value={form.holidayThemeAssetUrl}
              onChange={(e) => updateField('holidayThemeAssetUrl', e.target.value)}
              rows={3}
              placeholder="https://... 节假日专用主题图"
            />
            <span className="field-help">用于节假日、活动日切换主题。没有配置时仍使用常规主题图。</span>
          </div>

          <div className="preview-box">
            <div className="preview-header">
              <div className="preview-mark">ONE</div>
              <div>
                <strong>{form.projectName || '统一品牌名称'}</strong>
                <div className="muted">同一套配置同步到全部端</div>
              </div>
            </div>
            <div className="preview-hero">
              <div>
                <span className="preview-label">主题位</span>
                <p className="mono">{form.themeAssetUrl || '未设置主题图片 URL'}</p>
              </div>
              <div>
                <span className="preview-label">节假日主题</span>
                <p className="mono">{form.holidayThemeAssetUrl || '未设置节假日主题 URL'}</p>
              </div>
            </div>
            {form.themeAssetUrl ? (
              <div className="branding-image-preview">
                <img src={form.themeAssetUrl} alt="统一主题预览" />
              </div>
            ) : null}
            {form.holidayThemeAssetUrl ? (
              <div className="branding-image-preview">
                <img src={form.holidayThemeAssetUrl} alt="节假日主题预览" />
              </div>
            ) : null}
          </div>

          <div className="actions-row">
            <button onClick={onSave} disabled={!form.projectName.trim() || saving}>
              {saving ? '保存中...' : '保存并同步所有端'}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
};
