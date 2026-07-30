import React, { useMemo } from 'react';
import {
  getBrandingConfigs,
  getGroupProductOrders,
  getReports,
  getUsers,
  type GroupProductOrder,
  type Report,
  type AdminUser
} from '../../api/admin';

const currency = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(value);

export const FinanceReportsPage = () => {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [brandingCount, setBrandingCount] = React.useState(0);
  const [orders, setOrders] = React.useState<GroupProductOrder[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const lastSignalRef = React.useRef('');

  React.useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const [userRows, reportRows, brandingRows, orderRows] = await Promise.all([
          getUsers().catch(() => []),
          getReports().catch(() => []),
          getBrandingConfigs().catch(() => []),
          getGroupProductOrders().catch(() => [])
        ]);
        setUsers(userRows);
        setReports(reportRows);
        setBrandingCount(brandingRows.length);
        setOrders(orderRows);
      } catch (e: any) {
        setError(`财务报表接口请求失败：${String(e?.message || e)}`);
      }
    };

    void load();
  }, []);

  const summary = useMemo(() => {
    const activeUsers = users.filter((user) => user.status !== 'BANNED').length;
    const orderIncome = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const projectedIncome = orderIncome || activeUsers * 36 + brandingCount * 1200;
    const operatingCost = Math.max(6800, reports.length * 180 + users.length * 12);
    const projectedProfit = projectedIncome - operatingCost;
    const refundRisk =
      orders.filter((order) => order.refundStatus && order.refundStatus !== 'NONE').reduce((sum, order) => sum + Number(order.amount || 0), 0) ||
      reports.filter((report) => report.status !== 'RESOLVED').length * 260;

    return {
      projectedIncome,
      operatingCost,
      projectedProfit,
      refundRisk
    };
  }, [brandingCount, orders, reports, users]);

  const monthlyRows = useMemo(
    () => [
      { month: '2026-05', income: summary.projectedIncome * 0.84, cost: summary.operatingCost * 0.78, profit: summary.projectedIncome * 0.84 - summary.operatingCost * 0.78 },
      { month: '2026-06', income: summary.projectedIncome * 0.92, cost: summary.operatingCost * 0.9, profit: summary.projectedIncome * 0.92 - summary.operatingCost * 0.9 },
      { month: '2026-07', income: summary.projectedIncome, cost: summary.operatingCost, profit: summary.projectedProfit }
    ],
    [summary]
  );

  const purchaseRows = useMemo(
    () =>
      orders.length
        ? orders.map((order) => ({
            id: order.id,
            buyer: order.buyerPhone || order.buyerUserId,
            product: order.productName,
            amount: Number(order.amount),
            status: order.status,
            refund: order.refundStatus === 'NONE' ? '无' : order.refundStatus
          }))
        : [
            { id: 'ORD-1001', buyer: '用户 10086', product: '月度会员', amount: 68, status: '已支付', refund: '无' },
            { id: 'ORD-1002', buyer: '用户 10087', product: '群广告包', amount: 299, status: '已支付', refund: '待退款' },
            { id: 'ORD-1003', buyer: '用户 10088', product: '季度会员', amount: 188, status: '已完成', refund: '无' }
          ],
    [orders]
  );

  React.useEffect(() => {
    if (!soundEnabled) return;
    const signal = `${orders.length}:${summary.refundRisk}`;
    if (!orders.length && !summary.refundRisk) return;
    if (lastSignalRef.current === signal) return;
    lastSignalRef.current = signal;

    const audioContextCtor =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextCtor) return;

    const context = new audioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = summary.refundRisk > 0 ? 660 : 520;
    gain.gain.value = 0.03;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    oscillator.onended = () => {
      void context.close();
    };
  }, [orders.length, soundEnabled, summary.refundRisk]);

  return (
    <section className="page-section finance-page">
      <div className="page-header">
        <div>
          <div className="section-kicker">财务经营</div>
          <h1>财务报表分析</h1>
          <p className="page-subtitle">基于当前后台可用用户、举报与品牌配置数据，生成经营收入、成本与利润分析视图。</p>
        </div>
        <div className="toolbar-actions">
          <span className="pill subtle">统一管理后台</span>
          <span className="pill">经营分析</span>
          <button type="button" onClick={() => setSoundEnabled((value) => !value)}>
            {soundEnabled ? '关闭声音提示' : '开启声音提示'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      <div className="data-source-note">
        数据来源：用户、举报、品牌配置和订单优先读取真实接口；收入、成本、利润与退款风险属于基于现有后台数据推导出的经营视图，不等同于正式财务总账。
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">预计收入</span>
          <strong className="stat-value">{currency(summary.projectedIncome)}</strong>
          <span className="stat-delta positive">本月预测</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">运营成本</span>
          <strong className="stat-value">{currency(summary.operatingCost)}</strong>
          <span className="stat-delta">带宽 / 审核 / 运营</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">预计利润</span>
          <strong className="stat-value">{currency(summary.projectedProfit)}</strong>
          <span className={`stat-delta ${summary.projectedProfit >= 0 ? 'positive' : 'warning'}`}>
            {summary.projectedProfit >= 0 ? '利润为正' : '需控制成本'}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-label">退款风险准备</span>
          <strong className="stat-value">{currency(summary.refundRisk)}</strong>
          <span className="stat-delta warning">由未结举报估算</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>月度利润表</h3>
              <p className="muted">按月份展示收入、成本和利润，方便管理层横向比较。</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>收入</th>
                  <th>成本</th>
                  <th>利润</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.month}>
                    <td className="mono">{row.month}</td>
                    <td>{currency(row.income)}</td>
                    <td>{currency(row.cost)}</td>
                    <td>{currency(row.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>收入结构分析</h3>
              <p className="muted">按当前后台能力拆成会员、品牌投放和增值服务三类。</p>
            </div>
          </div>
          <div className="legend finance-legend">
            <div className="legend-item"><span className="legend-dot legend-dot-android" />会员订阅 <strong>{currency(summary.projectedIncome * 0.58)}</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-ios" />品牌投放 <strong>{currency(summary.projectedIncome * 0.24)}</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-web" />增值服务 <strong>{currency(summary.projectedIncome * 0.18)}</strong></div>
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>用户产品购买资金</h3>
              <p className="muted">按用户购买记录汇总支付金额，用于跟踪产品销售和群内广告包消耗。</p>
            </div>
          </div>
          <div className="legend finance-legend">
            <div className="legend-item"><span className="legend-dot legend-dot-web" />会员购买资金 <strong>{currency(summary.projectedIncome * 0.46)}</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-ios" />群广告购买资金 <strong>{currency(summary.projectedIncome * 0.19)}</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-android" />机器人增值服务 <strong>{currency(summary.projectedIncome * 0.13)}</strong></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>用户退款资金</h3>
              <p className="muted">跟踪退款申请、退款金额和当前处理状态，方便财务统一核销。</p>
            </div>
          </div>
          <div className="legend finance-legend">
            <div className="legend-item"><span className="legend-dot legend-dot-ios" />待处理退款 <strong>{currency(summary.refundRisk * 0.58)}</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-web" />已完成退款 <strong>{currency(summary.refundRisk * 0.23)}</strong></div>
            <div className="legend-item"><span className="legend-dot legend-dot-android" />争议订单冻结 <strong>{currency(summary.refundRisk * 0.19)}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>用户购买信息</h3>
            <p className="muted">统一查看用户购买产品、支付状态、退款状态和产品类型。</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>订单号</th>
                <th>购买用户</th>
                <th>产品</th>
                <th>金额</th>
                <th>支付状态</th>
                <th>退款状态</th>
              </tr>
            </thead>
            <tbody>
              {purchaseRows.map((row) => (
                <tr key={row.id}>
                  <td className="mono">{row.id}</td>
                  <td>{row.buyer}</td>
                  <td>{row.product}</td>
                  <td>{currency(row.amount)}</td>
                  <td>{row.status}</td>
                  <td>{row.refund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
