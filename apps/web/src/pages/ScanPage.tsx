import React from 'react';
import { Link } from 'react-router-dom';
import { scanShortcuts } from './wechatSecondaryData';

export default function ScanPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>扫一扫</h1>
          <p>预留扫码识别、加好友、收付款与海报解析等高频入口。</p>
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
          <p>当前为 Web 预览演示层，先提供微信式扫码界面和快捷入口承接。</p>
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
