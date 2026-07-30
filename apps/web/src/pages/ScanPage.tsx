import React from 'react';
import { Link } from 'react-router-dom';

export default function ScanPage() {
  return (
    <section className="h5-page">
      <header className="top-bar top-bar-split">
        <div>
          <h1>扫一扫</h1>
          <p>这里会接入扫码、识别和快捷跳转能力。</p>
        </div>
        <Link className="mini-link" to="/h5/discover">
          返回发现
        </Link>
      </header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会接入扫码、识别和快捷跳转能力。</p>
        </section>
      </div>
    </section>
  );
}
