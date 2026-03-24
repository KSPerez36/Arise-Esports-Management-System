import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FiscalYearContext } from '../context/FiscalYearContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie, faArrowDown, faArrowUp, faWallet,
  faUsers, faChartLine
} from '@fortawesome/free-solid-svg-icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import Stats from '../components/Stats';
import './Dashboard.css';

const API_URL = 'http://127.0.0.1:8080/api';

const fmt = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);

const DONUT_COLORS = ['#ef4444', '#059669'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 6px', fontSize: 13 }}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ margin: '2px 0', fontSize: 12, color: p.color, fontWeight: 600 }}>
            {p.name}: {fmt(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { academicYear } = useContext(FiscalYearContext);
  const navigate = useNavigate();
  const canViewFinance = ['Admin', 'Treasurer', 'Auditor'].includes(user?.role);

  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [finSummary, setFinSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => { fetchStats(); }, [academicYear]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (canViewFinance) fetchFinanceData(); }, [academicYear, canViewFinance]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/members/stats/summary?academicYear=${academicYear}`);
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceData = async () => {
    try {
      const [summary, monthly] = await Promise.all([
        axios.get(`${API_URL}/finances/summary?academicYear=${academicYear}`),
        axios.get(`${API_URL}/finances/monthly-summary?academicYear=${academicYear}`),
      ]);
      setFinSummary(summary.data);
      setMonthlyData(monthly.data);
    } catch (err) {
      console.error('Error fetching finance data:', err);
    }
  };

  const pctUtilized = finSummary?.totalBudget > 0
    ? Math.min(100, Math.round((finSummary.totalExpense / finSummary.totalBudget) * 100))
    : 0;

  const donutData = finSummary ? [
    { name: 'Spent',     value: finSummary.totalExpense },
    { name: 'Remaining', value: Math.max(0, finSummary.totalBudget - finSummary.totalExpense) },
  ] : [];

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">Welcome back, {user?.name} — here's your organization overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/members')}>
          View All Members
        </button>
      </div>

      {/* ── Members Stats ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">
            <FontAwesomeIcon icon={faUsers} style={{ marginRight: 8, color: '#3366FF' }} />
            Membership Overview
          </h2>
          <span className="dash-section-badge">{academicYear}</span>
        </div>
        {loading ? (
          <div className="dash-loading">Loading statistics...</div>
        ) : (
          <Stats stats={stats} />
        )}
      </div>

      {/* ── Finance Charts (Admin only) ── */}
      {canViewFinance && finSummary && (
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">
              <FontAwesomeIcon icon={faChartLine} style={{ marginRight: 8, color: '#3366FF' }} />
              Finance Overview
            </h2>
            <span className="dash-section-badge">Current Year</span>
          </div>

          {/* Finance Summary Cards */}
          <div className="dash-fin-cards">
            <div className="dash-fin-card dash-fin-card-budget">
              <div className="dash-fin-card-icon"><FontAwesomeIcon icon={faChartPie} /></div>
              <div>
                <div className="dash-fin-card-label">Total Budget</div>
                <div className="dash-fin-card-value">{fmt(finSummary.totalBudget)}</div>
              </div>
            </div>
            <div className="dash-fin-card dash-fin-card-income">
              <div className="dash-fin-card-icon"><FontAwesomeIcon icon={faArrowDown} /></div>
              <div>
                <div className="dash-fin-card-label">Total Income</div>
                <div className="dash-fin-card-value">{fmt(finSummary.totalIncome)}</div>
              </div>
            </div>
            <div className="dash-fin-card dash-fin-card-expense">
              <div className="dash-fin-card-icon"><FontAwesomeIcon icon={faArrowUp} /></div>
              <div>
                <div className="dash-fin-card-label">Total Expenses</div>
                <div className="dash-fin-card-value">{fmt(finSummary.totalExpense)}</div>
              </div>
            </div>
            <div className={`dash-fin-card ${finSummary.balance >= 0 ? 'dash-fin-card-balance-pos' : 'dash-fin-card-balance-neg'}`}>
              <div className="dash-fin-card-icon"><FontAwesomeIcon icon={faWallet} /></div>
              <div>
                <div className="dash-fin-card-label">Net Balance</div>
                <div className="dash-fin-card-value">{fmt(finSummary.balance)}</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="dash-charts-grid">

            {/* Bar Chart — Monthly Income vs Expense */}
            <div className="dash-chart-card">
              <p className="dash-chart-title">
                Monthly Income vs Expenses
                <span className="dash-chart-sub">Current year breakdown</span>
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="income"  name="Income"  fill="#3366FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut Chart — Budget Utilization */}
            <div className="dash-chart-card">
              <p className="dash-chart-title">
                Budget Utilization
                <span className="dash-chart-sub">Spent vs remaining</span>
              </p>
              <div className="dash-donut-wrap" style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData.every(d => d.value === 0) ? [{ name: 'No data', value: 1 }] : donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={donutData.every(d => d.value === 0) ? 0 : 3}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.every(d => d.value === 0)
                        ? <Cell fill="#e2e8f0" />
                        : donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)
                      }
                    </Pie>
                    <Tooltip formatter={(v, name) => [fmt(v), name]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dash-donut-center">
                  <div className="dash-donut-pct">{pctUtilized}%</div>
                  <div className="dash-donut-label">Utilized</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;