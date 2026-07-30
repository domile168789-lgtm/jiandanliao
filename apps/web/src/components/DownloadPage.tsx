import React from 'react';

const androidMeta = 'Android 包：阶段 1 演示版';

export default function DownloadPage() {
  return (
    <main className="download-shell">
      <section className="download-hero">
        <h1>柬单聊下载</h1>
        <p>请选择你的设备，优先体验 Web/H5，Android 可直接下载安装。</p>
      </section>

      <section className="download-card">
        <h2>Android</h2>
        <p>可下载安装</p>
        <p className="download-meta">{androidMeta}</p>
        <a className="primary-button" href="/downloads/jianliao-android.apk" download>
          下载安装 Android 版
        </a>
        <p className="download-hint">如浏览器提示风险，请按设备提示继续安装。</p>
      </section>

      <section className="download-card muted">
        <h2>iPhone / iPad</h2>
        <p>安装通道准备中</p>
        <p>当前正在申请签名证书，证书就绪后将开放下载安装。</p>
      </section>
    </main>
  );
}
