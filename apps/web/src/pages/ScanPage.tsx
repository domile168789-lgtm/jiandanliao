import React from 'react';
import { Link } from 'react-router-dom';
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
  const result = React.useMemo(() => resolveScanResult(code), [code]);

  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>扫一扫</h1>
          <p>支持模拟识别好友码、收付款码和活动海报，继续承接到真实业务页面。</p>
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
          <p>Web 预览下先提供模拟识别结果，后续可继续接入摄像头与图片识别能力。</p>
        </section>
        <section className="section-card scan-form-card">
          <strong>模拟扫码结果</strong>
          <div className="action-chip-row">
            {scanPresets.map((item) => (
              <button
                key={item.code}
                type="button"
                className="secondary-button"
                onClick={() => setCode(item.code)}
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
              onChange={(event) => setCode(event.target.value)}
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
