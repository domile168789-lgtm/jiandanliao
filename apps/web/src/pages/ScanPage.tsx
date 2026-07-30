import React from 'react';
import { Link } from 'react-router-dom';
import DataModeNotice from '../components/DataModeNotice';
import { getErrorMessage } from '../api/loadable';
import { resolveScanImage, type ScanResolveResult } from '../api/security';
import { scanShortcuts } from './wechatSecondaryData';

const scanPresets = [
  { label: '好友二维码', code: 'friend:855010188001' },
  { label: '收付款码', code: 'wallet:collect' },
  { label: '活动海报码', code: 'poster:new-user-campaign' }
] as const;

function resolveScanResult(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.startsWith('friend:')) {
    const phone = code.trim().slice('friend:'.length) || '855010188001';
    return {
      title: '识别到好友二维码',
      description: `已识别联系人手机号 ${phone}，可直接进入新的朋友页继续处理。`,
      to: '/h5/contacts/friends',
      actionLabel: '去添加朋友'
    };
  }

  if (normalized.startsWith('wallet:')) {
    return {
      title: '识别到收付款码',
      description: '该二维码指向钱包收付款入口，可继续查看余额、账单和结算。 ',
      to: '/h5/wallet',
      actionLabel: '前往钱包'
    };
  }

  if (normalized.startsWith('poster:')) {
    return {
      title: '识别到活动海报',
      description: '该内容已解析为活动素材，可继续前往看一看查看推荐内容。',
      to: '/h5/discover/channels',
      actionLabel: '查看活动内容'
    };
  }

  return {
    title: '识别到普通内容',
    description: '当前内容已保存为演示扫码结果，可继续使用搜一搜或发现入口查看。',
    to: '/h5/discover/search',
    actionLabel: '去搜一搜'
  };
}

export default function ScanPage() {
  const [code, setCode] = React.useState('');
  const [imageResult, setImageResult] = React.useState<ScanResolveResult | null>(null);
  const [noticeMessage, setNoticeMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const result = React.useMemo(() => imageResult || resolveScanResult(code), [code, imageResult]);

  const handleScanImage = async (file: File) => {
    setUploading(true);
    setErrorMessage(null);
    setNoticeMessage(null);
    try {
      const resolved = await resolveScanImage(file);
      setImageResult(resolved);
      setCode(resolved.code);
      setNoticeMessage(`已完成图片识别：${file.name}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '图片识别失败，请稍后重试'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>扫一扫</h1>
          <p>支持上传二维码图片识别，也保留手动模拟结果便于预览业务跳转。</p>
        </div>
        <Link className="mini-link" to="/h5/discover">
          返回发现
        </Link>
      </header>
      <div className="placeholder-list detail-page">
        <section className="scanner-card">
          <div className="scanner-frame" aria-hidden="true">
            <span className="scanner-corner is-top-left" />
            <span className="scanner-corner is-top-right" />
            <span className="scanner-corner is-bottom-left" />
            <span className="scanner-corner is-bottom-right" />
            <span className="scanner-line" />
          </div>
          <strong>对准二维码 / 条形码即可识别</strong>
          <p>当前优先支持图片上传识别，后续可以继续补摄像头扫码能力。</p>
        </section>
        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {noticeMessage ? <DataModeNotice message={noticeMessage} /> : null}
        <section className="section-card scan-form-card">
          <strong>图片识别与模拟扫码</strong>
          <label className="search-box" htmlFor="scan-image-upload">
            <span>上传二维码图片</span>
            <input
              id="scan-image-upload"
              aria-label="上传二维码图片"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handleScanImage(file);
              }}
            />
          </label>
          {uploading ? <p className="conversation-state">图片识别中...</p> : null}
          <div className="action-chip-row">
            {scanPresets.map((item) => (
              <button
                key={item.code}
                type="button"
                className="secondary-button"
                onClick={() => {
                  setImageResult(null);
                  setCode(item.code);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="search-box" htmlFor="scan-demo-code">
            <span>扫码内容</span>
            <input
              id="scan-demo-code"
              name="scan-demo-code"
              placeholder="例如：friend:855010188001"
              value={code}
              onChange={(event) => {
                setImageResult(null);
                setCode(event.target.value);
              }}
            />
          </label>
          {result ? (
            <article className="scan-result-card">
              <div className="detail-copy">
                <strong>{result.title}</strong>
                <p>{result.description}</p>
              </div>
              <Link className="primary-button is-small scan-result-link" to={result.to}>
                {result.actionLabel}
              </Link>
            </article>
          ) : null}
        </section>
        <section className="stack-panel" aria-label="扫码快捷操作">
          {scanShortcuts.map((item) => (
            <Link key={item.title} className="detail-row-link" to={item.to}>
              <article className="detail-row-card">
                <div className="detail-copy">
                  <strong>{item.title}</strong>
                  <p>点击后进入对应业务页面继续操作。</p>
                </div>
              </article>
            </Link>
          ))}
        </section>
      </div>
    </section>
  );
}
