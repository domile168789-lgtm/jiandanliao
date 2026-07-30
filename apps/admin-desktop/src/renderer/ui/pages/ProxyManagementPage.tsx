import React from 'react';

const AGENT_ROWS = [
  { id: 'AG1001', name: '华南代理', level: '一级代理', users: 328, rebate: '12%', status: '正常' },
  { id: 'AG1002', name: '东南亚代理', level: '一级代理', users: 216, rebate: '10%', status: '正常' },
  { id: 'AG1003', name: '本地渠道代理', level: '二级代理', users: 89, rebate: '8%', status: '待审核' }
];

export const ProxyManagementPage = () => {
  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="section-kicker">渠道体系</div>
          <h1>代理管理</h1>
          <p className="page-subtitle">统一查看代理层级、代理带来的用户规模、返点比例和当前状态。</p>
        </div>
        <div className="toolbar-actions">
          <button type="button">新增代理</button>
          <span className="pill subtle">统一管理后台</span>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">代理总数</span>
          <strong className="stat-value">23</strong>
          <span className="stat-delta positive">本月新增 3 个</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">代理带来用户</span>
          <strong className="stat-value">6,482</strong>
          <span className="stat-delta">占全平台 38%</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">本月返点</span>
          <strong className="stat-value">¥82,000</strong>
          <span className="stat-delta warning">待结算 ¥12,000</span>
        </article>
      </div>

      <div className="data-source-note">
        数据来源：当前仓库尚无独立代理管理后端接口。本页暂展示演示数据，用于占位后台入口和确认后续代理体系所需字段，不应视为真实运营台账。
      </div>

      <div className="table-wrap panel">
        <table className="table">
          <thead>
            <tr>
              <th>代理ID</th>
              <th>代理名称</th>
              <th>层级</th>
              <th>用户数</th>
              <th>返点比例</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {AGENT_ROWS.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.id}</td>
                <td>{row.name}</td>
                <td>{row.level}</td>
                <td>{row.users}</td>
                <td>{row.rebate}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
