import { formatCurrency } from '../utils/helpers';

const Stats = ({ stats, totalIncome }) => {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3>Total Members</h3>
        <p>{stats.totalMembers || 0}</p>
      </div>
      <div className="stat-card">
        <h3>Official Members</h3>
        <p>{stats.officialMembers || 0}</p>
      </div>
      <div className="stat-card">
        <h3>Paid Members</h3>
        <p>{stats.paidMembers || 0}</p>
      </div>
      <div className="stat-card">
        <h3>Unpaid Members</h3>
        <p>{stats.unpaidMembers || 0}</p>
      </div>
      <div className="stat-card">
        <h3>Pending</h3>
        <p>{stats.pendingMembers || 0}</p>
      </div>
      <div className="stat-card">
        <h3>Total Revenue</h3>
        <p>{formatCurrency(totalIncome !== null ? totalIncome : (stats.totalRevenue || 0))}</p>
      </div>
    </div>
  );
};

export default Stats;